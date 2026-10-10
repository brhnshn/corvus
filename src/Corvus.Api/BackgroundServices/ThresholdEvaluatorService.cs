using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.BackgroundServices;

public class ThresholdEvaluatorService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ThresholdEvaluatorService> _logger;

    public ThresholdEvaluatorService(
        IServiceProvider services, 
        ILogger<ThresholdEvaluatorService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ThresholdEvaluatorService başlatıldı (Periyot: 20sn).");

        // İlk açılışta diğer servislerin toparlanması için kısa bir bekleme
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var ruleRepo = scope.ServiceProvider.GetRequiredService<IAlertRuleRepository>();
                var metricsRepo = scope.ServiceProvider.GetRequiredService<IMetricsRepository>();
                var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                var activityLogService = scope.ServiceProvider.GetService<IActivityLogService>();

                var rules = (await ruleRepo.GetEnabledRulesAsync()).ToList();
                if (rules.Count > 0)
                {
                    // En son sistem metriğini al
                    var latestMetric = await metricsRepo.GetLatestAsync();

                    if (latestMetric != null)
                    {
                        var now = DateTime.UtcNow;

                        foreach (var rule in rules)
                        {
                            await EvaluateRuleAsync(rule, latestMetric, now, ruleRepo, notificationService, activityLogService, stoppingToken);
                        }
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Eşik kuralları değerlendirilirken hata oluştu.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("ThresholdEvaluatorService durduruldu.");
    }

    private static async Task EvaluateRuleAsync(
        AlertRule rule,
        SystemMetric metric,
        DateTime now,
        IAlertRuleRepository ruleRepo,
        INotificationService notificationService,
        IActivityLogService? activityLogService,
        CancellationToken ct)
    {
        // Hedef 'system' olan kuralların değerlendirilmesi
        if (rule.TargetType != "system")
        {
            return; // Konteyner kuralları ayrı stat toplama genişletmesiyle ele alınabilir
        }

        double currentValue = 0;
        switch (rule.Metric.ToLowerInvariant())
        {
            case "cpu":
                currentValue = metric.CpuPercent;
                break;
            case "memory":
            case "ram":
                currentValue = metric.RamTotalMb > 0 
                    ? ((double)metric.RamUsedMb / metric.RamTotalMb) * 100.0 
                    : 0;
                break;
            case "disk":
                currentValue = metric.DiskTotalGb > 0 
                    ? ((double)metric.DiskUsedGb / metric.DiskTotalGb) * 100.0 
                    : 0;
                break;
            default:
                return;
        }

        bool isViolating = rule.Operator.ToLowerInvariant() switch
        {
            "lt" => currentValue < rule.ThresholdValue,
            _ => currentValue > rule.ThresholdValue
        };

        if (isViolating)
        {
            DateTime violationStart = rule.ViolationStartAt ?? now;

            // Eşik ihlali ne zamandır sürüyor?
            double durationPassedSec = (now - violationStart).TotalSeconds;

            if (durationPassedSec >= rule.DurationSeconds)
            {
                // Cooldown kontrolü (spam önleme)
                bool canTrigger = true;
                if (rule.LastTriggeredAt.HasValue)
                {
                    double minutesSinceLast = (now - rule.LastTriggeredAt.Value).TotalMinutes;
                    if (minutesSinceLast < rule.CooldownMinutes)
                    {
                        canTrigger = false;
                    }
                }

                if (canTrigger)
                {
                    await notificationService.DispatchMetricThresholdAlertAsync(
                        rule.Name,
                        "Host Sunucu (Tüm Sistem)",
                        rule.Metric,
                        rule.ThresholdValue,
                        currentValue,
                        isResolved: false,
                        ct);

                    activityLogService?.Log(
                        "system", 
                        "threshold_alert_firing", 
                        "alert", 
                        $"{rule.Name} ({rule.Metric.ToUpperInvariant()} > %{rule.ThresholdValue})", 
                        $"{{\"currentValue\":{currentValue:F1},\"threshold\":{rule.ThresholdValue}}}");

                    await ruleRepo.UpdateRuleStateAsync(rule.Id, isFiring: true, violationStartAt: violationStart, lastTriggeredAt: now);
                }
                else if (!rule.IsFiring)
                {
                    await ruleRepo.UpdateRuleStateAsync(rule.Id, isFiring: true, violationStartAt: violationStart, lastTriggeredAt: rule.LastTriggeredAt);
                }
            }
            else
            {
                // İhlal başladı ama henüz süre dolmadı, violation start'ı kaydet
                if (!rule.ViolationStartAt.HasValue)
                {
                    await ruleRepo.UpdateRuleStateAsync(rule.Id, isFiring: false, violationStartAt: violationStart, lastTriggeredAt: rule.LastTriggeredAt);
                }
            }
        }
        else
        {
            // İhlal bitti, eğer daha önce ateşlenmişse (IsFiring) çözüm bildirimi gönder
            if (rule.IsFiring)
            {
                await notificationService.DispatchMetricThresholdAlertAsync(
                    rule.Name,
                    "Host Sunucu (Tüm Sistem)",
                    rule.Metric,
                    rule.ThresholdValue,
                    currentValue,
                    isResolved: true,
                    ct);

                activityLogService?.Log(
                    "system", 
                    "threshold_alert_resolved", 
                    "alert", 
                    $"{rule.Name} ({rule.Metric.ToUpperInvariant()})", 
                    $"{{\"currentValue\":{currentValue:F1},\"resolved\":true}}");

                await ruleRepo.UpdateRuleStateAsync(rule.Id, isFiring: false, violationStartAt: null, lastTriggeredAt: now);
            }
            else if (rule.ViolationStartAt.HasValue)
            {
                // Henüz ateşlenmeden düzeldi, ihlali sıfırla
                await ruleRepo.UpdateRuleStateAsync(rule.Id, isFiring: false, violationStartAt: null, lastTriggeredAt: rule.LastTriggeredAt);
            }
        }
    }
}
