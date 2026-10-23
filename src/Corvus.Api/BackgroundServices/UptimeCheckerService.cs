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

public partial class UptimeCheckerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<UptimeCheckerService> _logger;
    private readonly IEventBroadcaster _eventBroadcaster;
    private readonly ConcurrentDictionary<string, int> _consecutiveFailures = new();
    private readonly ConcurrentDictionary<string, bool> _alertedDown = new();
    private readonly ConcurrentDictionary<string, DateTime> _lastCheckTimes = new();
    private readonly ConcurrentDictionary<string, string> _previousStatus = new();
    private record SslAlertState(int Level, DateTime AlertDate);
    private readonly ConcurrentDictionary<string, SslAlertState> _lastSslAlerts = new();
    private static readonly HttpRequestOptionsKey<SslInfoHolder> SslInfoKey = HttpProtocolChecker.SslInfoKey;
    private static readonly HttpRequestOptionsKey<bool> IgnoreTlsKey = HttpProtocolChecker.IgnoreTlsKey;
    private readonly HttpClient _httpClient;
    private DateTime _lastServicesRefresh = DateTime.MinValue;
    private List<Service> _cachedServices = [];
    private DateTime _lastPushRefresh = DateTime.MinValue;
    private List<PushMonitor> _cachedPushMonitors = [];
    private DateTime _lastThresholdRefresh = DateTime.MinValue;
    private int _cachedAlertThreshold = 2;
    private readonly IFlappingDetector _flappingDetector;
    private bool _cachedFlappingEnabled = true;
    private int _cachedFlappingThreshold = 4;
    private int _cachedFlappingWindowMinutes = 10;
    private int _cachedFlappingRecoveryChecks = 3;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(25);
    private static readonly TimeSpan ThresholdCacheTtl = TimeSpan.FromMinutes(1);

    public UptimeCheckerService(
        IServiceProvider services, 
        ILogger<UptimeCheckerService> logger,
        IEventBroadcaster eventBroadcaster,
        IFlappingDetector flappingDetector)
    {
        _services = services;
        _logger = logger;
        _eventBroadcaster = eventBroadcaster;
        _flappingDetector = flappingDetector;

        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) =>
            {
                if (message.Options.TryGetValue(SslInfoKey, out var holder) && cert != null)
                {
                    holder.SslDays = (int)Math.Max(0, (cert.NotAfter - DateTime.UtcNow).TotalDays);
                    holder.SslIssuer = cert.Issuer;
                }

                if (errors == System.Net.Security.SslPolicyErrors.None)
                {
                    return true;
                }

                return message.Options.TryGetValue(IgnoreTlsKey, out bool ignore) && ignore;
            }
        };

        _httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("UptimeCheckerService başlatıldı (Periyot tabanlı denetim, tick: 5sn).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;

                await RefreshSettingsCacheAsync(now);
                await RefreshServicesCacheAsync(now);
                await RunDueServiceChecksAsync(now, _cachedAlertThreshold, stoppingToken);
                await CheckPushMonitorsAsync(now, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Uptime kontrolü döngüsünde hata oluştu.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("UptimeCheckerService durduruldu.");
    }

    // 1. Eşik ve dalgalanma ayarları önbelleği (Dakikada 1 kez yenilenir)
    private async Task RefreshSettingsCacheAsync(DateTime now)
    {
        if ((now - _lastThresholdRefresh) >= ThresholdCacheTtl)
        {
            try
            {
                using var scope = _services.CreateScope();
                var settingsRepo = scope.ServiceProvider.GetRequiredService<ISettingsRepository>();
                var thresholdSetting = await settingsRepo.GetAsync("uptime_alert_threshold");
                if (int.TryParse(thresholdSetting, out var parsedThreshold) && parsedThreshold >= 1)
                {
                    _cachedAlertThreshold = parsedThreshold;
                }

                var flapEnabledStr = await settingsRepo.GetAsync("flapping_protection_enabled");
                if (flapEnabledStr != null) _cachedFlappingEnabled = flapEnabledStr != "false";

                var flapThresholdStr = await settingsRepo.GetAsync("flapping_threshold");
                if (int.TryParse(flapThresholdStr, out var ft) && ft >= 2) _cachedFlappingThreshold = ft;

                var flapWindowStr = await settingsRepo.GetAsync("flapping_window_minutes");
                if (int.TryParse(flapWindowStr, out var fw) && fw >= 1) _cachedFlappingWindowMinutes = fw;

                var flapRecoveryStr = await settingsRepo.GetAsync("flapping_recovery_checks");
                if (int.TryParse(flapRecoveryStr, out var fr) && fr >= 1) _cachedFlappingRecoveryChecks = fr;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Uptime alert threshold ayarı okunurken geçici hata.");
            }
            _lastThresholdRefresh = now;
        }
    }

    // 2. Servis listesi önbelleği (Her 5sn yerine 25sn periyotla taranarak DI ve GC tahsisleri %80 oranında düşürülür)
    private async Task RefreshServicesCacheAsync(DateTime now)
    {
        if ((now - _lastServicesRefresh) >= CacheTtl || _cachedServices.Count == 0)
        {
            try
            {
                using var scope = _services.CreateScope();
                var servicesRepo = scope.ServiceProvider.GetRequiredService<IServicesRepository>();
                _cachedServices = await servicesRepo.GetAllAsync();
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Servis listesi önbelleği yenilenirken geçici hata.");
            }
            _lastServicesRefresh = now;
        }
    }

    public override void Dispose()
    {
        _httpClient.Dispose();
        base.Dispose();
    }
}
