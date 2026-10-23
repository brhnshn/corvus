using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Corvus.Api.Services.Uptime.Checkers;
using Corvus.Api.Utils;

namespace Corvus.Api.BackgroundServices;

// Servis denetim sonuçlarının işlenmesi: SSL uyarıları, DOWN/DEGRADED/HEALTHY durum geçişleri ve dalgalanma bildirimleri
public partial class UptimeCheckerService
{
    private async Task RunDueServiceChecksAsync(DateTime now, int alertThreshold, CancellationToken stoppingToken)
    {
        var allServices = _cachedServices;

        // SADECE Uptime takibi kullanıcı tarafından aktif edilmiş servisler denetlenir!
        var servicesToCheck = allServices
            .Where(s => s.IsUptimeEnabled && !string.Equals(s.CheckType, "none", StringComparison.OrdinalIgnoreCase))
            .Where(s =>
            {
                // Konteyner Docker'da durdurulmuşsa (down) kontrolü atla (skip), degraded yapma!
                if (s.Source == "docker" && s.Status == "down")
                {
                    return false;
                }

                int intervalSec = Math.Max(5, s.CheckInterval ?? 60);
                if (_lastCheckTimes.TryGetValue(s.Id, out var lastTime))
                {
                    return (now - lastTime).TotalSeconds >= intervalSec;
                }
                return true;
            }).ToList();

        if (servicesToCheck.Count > 0)
        {
            using var scope = _services.CreateScope();
            var servicesRepo = scope.ServiceProvider.GetRequiredService<IServicesRepository>();
            var uptimeRepo = scope.ServiceProvider.GetRequiredService<IUptimeRepository>();
            var notifService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            foreach (var s in servicesToCheck)
            {
                _lastCheckTimes[s.Id] = now;
            }

            // Kontrollü eşzamanlılık (DNS ve soket tükenmesini engellemek için)
            var checkResults = new ConcurrentBag<(Service Service, UptimeCheck? Check, SslInfoHolder? Ssl)>();
            var parallelOptions = new ParallelOptions
            {
                MaxDegreeOfParallelism = 6,
                CancellationToken = stoppingToken
            };

            await Parallel.ForEachAsync(servicesToCheck, parallelOptions, async (s, ct) =>
            {
                var res = await CheckSingleServiceAsync(s, ct);
                checkResults.Add(res);
            });

            foreach (var (s, check, sslHolder) in checkResults)
            {
                if (check == null) continue;

                await ProcessSslInfoAsync(s, sslHolder, servicesRepo, notifService, stoppingToken);

                // Durum değişimi (transition) kontrolü:
                // Bir servisin durumu değiştiğinde (örn. up -> down, down -> up) veya status == "down" olduğunda check.IsTransition = true
                bool hasPrevious = _previousStatus.TryGetValue(s.Id, out var prevStatus);
                bool statusChanged = !hasPrevious || !string.Equals(prevStatus, check.Status, StringComparison.OrdinalIgnoreCase);

                if (statusChanged || check.Status == "down")
                {
                    check.IsTransition = true;
                }
                _previousStatus[s.Id] = check.Status;

                await uptimeRepo.InsertAsync(check);

                string? targetUrl = !string.IsNullOrWhiteSpace(s.HealthCheckUrl) ? s.HealthCheckUrl : s.Url;

                if (check.Status == "down")
                {
                    await ApplyDownResultAsync(s, check, targetUrl, alertThreshold, now, servicesRepo, notifService, stoppingToken);
                }
                else if (check.Status == "up")
                {
                    await ApplyUpResultAsync(s, targetUrl, now, servicesRepo, notifService, stoppingToken);
                }
            }
        }
    }

    // SSL sertifika bitiş takibi: 14 gün uyarı, 7 gün kritik; günde en fazla 1 hatırlatma
    private async Task ProcessSslInfoAsync(Service s, SslInfoHolder? sslHolder, IServicesRepository servicesRepo, INotificationService notifService, CancellationToken stoppingToken)
    {
        if (sslHolder is not { SslDays: int sslDays })
        {
            return;
        }

        await servicesRepo.UpdateSslInfoAsync(s.Id, sslDays, sslHolder.SslIssuer);

        if (sslDays <= 14)
        {
            int alertLevel = sslDays <= 7 ? 7 : 14;
            var today = DateTime.UtcNow.Date;

            bool shouldAlert = false;
            if (!_lastSslAlerts.TryGetValue(s.Id, out var lastAlert))
            {
                shouldAlert = true;
            }
            else if (lastAlert.Level > alertLevel)
            {
                // 14 günlük uyarıdan 7 günlük kritik uyarıya geçiş
                shouldAlert = true;
            }
            else if (lastAlert.AlertDate < today)
            {
                // Günde en fazla 1 kez hatırlatma
                shouldAlert = true;
            }

            if (shouldAlert)
            {
                _lastSslAlerts[s.Id] = new SslAlertState(alertLevel, today);
                _logger.LogWarning("SSL sertifikası bitiş uyarısı tetiklendi: Servis {ServiceName}, Kalan Gün: {Days} (Seviye: {Level}g)", s.Name, sslDays, alertLevel);
                string? alertUrl = !string.IsNullOrWhiteSpace(s.HealthCheckUrl) ? s.HealthCheckUrl : s.Url;
                _ = notifService.DispatchSslExpiryAlertAsync(s.Name, alertUrl ?? $"Port:{s.Port}", sslDays, sslHolder.SslIssuer, stoppingToken);
            }
        }
        else
        {
            // Sertifika yenilenmiş (> 14 gün), aktif alarm durumunu temizle
            _lastSslAlerts.TryRemove(s.Id, out _);
        }
    }

    // 3 Durumlu Durum Makinesi: eşik altı hatalar DEGRADED, eşik aşıldığında kesin DOWN
    private async Task ApplyDownResultAsync(Service s, UptimeCheck check, string? targetUrl, int alertThreshold, DateTime now, IServicesRepository servicesRepo, INotificationService notifService, CancellationToken stoppingToken)
    {
        _consecutiveFailures.AddOrUpdate(s.Id, 1, (_, count) => count + 1);
        int failures = _consecutiveFailures[s.Id];

        // 3 Durumlu Durum Makinesi (Finite State Machine) Mantığı:
        // Eşik değerine ulaşıldıysa -> Kesin DOWN
        if (failures >= alertThreshold)
        {
            var flapDecision = _flappingDetector.Evaluate(
                s.Id,
                "down",
                now,
                _cachedFlappingEnabled,
                _cachedFlappingThreshold,
                TimeSpan.FromMinutes(_cachedFlappingWindowMinutes),
                _cachedFlappingRecoveryChecks);

            if (flapDecision == FlappingDecision.FlappingStarted)
            {
                _logger.LogWarning("Servis {Name} için dalgalanma (flapping) tespit edildi! Bildirimler geçici olarak susturuldu.", s.Name);
                int transitions = _flappingDetector.GetTransitionCount(s.Id, now, TimeSpan.FromMinutes(_cachedFlappingWindowMinutes));
                _ = notifService.DispatchFlappingAlertAsync(s.Name, targetUrl ?? $"Port:{s.Port}", isRecovered: false, transitions, stoppingToken);
                _alertedDown[s.Id] = true;
            }
            else if (flapDecision == FlappingDecision.Normal)
            {
                if (_alertedDown.TryAdd(s.Id, true))
                {
                    _ = notifService.DispatchServiceAlertAsync(s.Name, targetUrl ?? $"Port:{s.Port}", isDown: true, check.ErrorMessage, stoppingToken);
                }
            }

            await servicesRepo.UpdateStatusAsync(s.Id, "down");
            s.Status = "down";
            _eventBroadcaster.Broadcast("service_status_changed", $"{{\"id\":\"{s.Id}\",\"status\":\"down\"}}");
        }
        else
        {
            // Henüz eşik aşılmadı -> Geçici aksaklık (PENDING / DEGRADED)
            _logger.LogInformation("Servis {Name} geçici hata verdi ({Failures}/{Threshold}). Durum 'degraded' olarak işaretlendi.", s.Name, failures, alertThreshold);
            await servicesRepo.UpdateStatusAsync(s.Id, "degraded");
            s.Status = "degraded";
            _eventBroadcaster.Broadcast("service_status_changed", $"{{\"id\":\"{s.Id}\",\"status\":\"degraded\"}}");
        }
    }

    private async Task ApplyUpResultAsync(Service s, string? targetUrl, DateTime now, IServicesRepository servicesRepo, INotificationService notifService, CancellationToken stoppingToken)
    {
        _consecutiveFailures[s.Id] = 0;

        var flapDecision = _flappingDetector.Evaluate(
            s.Id,
            "up",
            now,
            _cachedFlappingEnabled,
            _cachedFlappingThreshold,
            TimeSpan.FromMinutes(_cachedFlappingWindowMinutes),
            _cachedFlappingRecoveryChecks);

        if (flapDecision == FlappingDecision.FlappingRecovered)
        {
            _logger.LogInformation("Servis {Name} dalgalanma (flapping) modundan çıktı ve kararlı duruma ulaştı.", s.Name);
            _ = notifService.DispatchFlappingAlertAsync(s.Name, targetUrl ?? $"Port:{s.Port}", isRecovered: true, 0, stoppingToken);
            _alertedDown.TryRemove(s.Id, out _);
        }
        else if (flapDecision == FlappingDecision.FlappingStarted)
        {
            _logger.LogWarning("Servis {Name} için dalgalanma (flapping) tespit edildi! Bildirimler geçici olarak susturuldu.", s.Name);
            int transitions = _flappingDetector.GetTransitionCount(s.Id, now, TimeSpan.FromMinutes(_cachedFlappingWindowMinutes));
            _ = notifService.DispatchFlappingAlertAsync(s.Name, targetUrl ?? $"Port:{s.Port}", isRecovered: false, transitions, stoppingToken);
            _alertedDown[s.Id] = true;
        }
        else if (flapDecision == FlappingDecision.Normal)
        {
            // Önceden kesinti bildirimi gönderilmişse kurtarıldı bildirimi gönder
            if (_alertedDown.TryRemove(s.Id, out _))
            {
                _ = notifService.DispatchServiceAlertAsync(s.Name, targetUrl ?? $"Port:{s.Port}", isDown: false, null, stoppingToken);
            }
        }

        _eventBroadcaster.Broadcast("service_status_changed", $"{{\"id\":\"{s.Id}\",\"status\":\"healthy\"}}");
        await servicesRepo.UpdateStatusAsync(s.Id, "healthy");
        s.Status = "healthy";
    }
}
