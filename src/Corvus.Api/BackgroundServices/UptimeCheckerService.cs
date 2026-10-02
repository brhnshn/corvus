using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Corvus.Api.Utils;

namespace Corvus.Api.BackgroundServices;

public class UptimeCheckerService : BackgroundService
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
    private static readonly HttpRequestOptionsKey<SslInfoHolder> SslInfoKey = new("Corvus_SslInfo");
    private static readonly HttpRequestOptionsKey<bool> IgnoreTlsKey = new("Corvus_IgnoreTls");
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

    private class SslInfoHolder
    {
        public int? SslDays { get; set; }
        public string? SslIssuer { get; set; }
    }

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

                // 1. Eşik ayarı önbelleği (Dakikada 1 kez yenilenir)
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
                int alertThreshold = _cachedAlertThreshold;

                // 2. Servis listesi önbelleği (Her 5sn yerine 25sn periyotla taranarak DI ve GC tahsisleri %80 oranında düşürülür)
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

                        if (sslHolder?.SslDays.HasValue == true)
                        {
                            int sslDays = sslHolder.SslDays.Value;
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
                        else if (check.Status == "up")
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
                }

                // 3. Dead Man's Snitch — Beklenen Periyot Kontrolü (Önbellekli okuma)
                if ((now - _lastPushRefresh) >= CacheTtl)
                {
                    try
                    {
                        using var scope = _services.CreateScope();
                        var pushRepo = scope.ServiceProvider.GetRequiredService<IPushMonitorRepository>();
                        _cachedPushMonitors = await pushRepo.GetAllAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Push monitör listesi önbelleği yenilenirken geçici hata.");
                    }
                    _lastPushRefresh = now;
                }

                var pushMonitors = _cachedPushMonitors;
                foreach (var pm in pushMonitors)
                {
                    if (!string.IsNullOrEmpty(pm.LastSeenAt) && 
                        DateTime.TryParse(pm.LastSeenAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out var lastSeen))
                    {
                        var allowedTime = TimeSpan.FromMinutes(pm.ExpectedIntervalMinutes + pm.GracePeriodMinutes);
                        if (DateTime.UtcNow - lastSeen.ToUniversalTime() > allowedTime && pm.Status != "down")
                        {
                            using var scope = _services.CreateScope();
                            var pushRepo = scope.ServiceProvider.GetRequiredService<IPushMonitorRepository>();
                            var notifService = scope.ServiceProvider.GetRequiredService<INotificationService>();

                            await pushRepo.UpdateStatusAsync(pm.Id, "down");
                            pm.Status = "down";
                            _ = notifService.DispatchServiceAlertAsync(
                                $"Dead Man's Snitch: {pm.Name}",
                                $"Token: {pm.Token}",
                                isDown: true,
                                $"Periyot süresi aşıldı! Son sinyal: {pm.LastSeenAt}",
                                stoppingToken);

                            _eventBroadcaster.Broadcast("snitch_status_changed", $"{{\"id\":\"{pm.Id}\",\"status\":\"down\"}}");
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

    private static string NormalizeHttpUrl(string url)
    {
        var trimmed = url.Trim();
        if (!trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return $"http://{trimmed}";
        }
        return trimmed;
    }

    private static bool IsLoopbackHost(string host)
    {
        return host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
               host == "127.0.0.1" ||
               host == "::1";
    }

    private static string? _cachedResolvedLoopback;
    private static readonly object _loopbackLock = new();

    private static string ResolveContainerLoopback()
    {
        if (_cachedResolvedLoopback != null)
        {
            return _cachedResolvedLoopback;
        }

        lock (_loopbackLock)
        {
            if (_cachedResolvedLoopback != null)
            {
                return _cachedResolvedLoopback;
            }

            // 1. Ortam değişkeniyle manuel belirtilmişse öncelik ver
            string? overrideHost = Environment.GetEnvironmentVariable("CORVUS_HOST_GATEWAY")
                                ?? Environment.GetEnvironmentVariable("CORVUS_INTERNAL_HOST");
            if (!string.IsNullOrWhiteSpace(overrideHost))
            {
                return _cachedResolvedLoopback = overrideHost.Trim();
            }

            // 2. Container içinde miyiz?
            bool inContainer = File.Exists("/.dockerenv") ||
                               string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase);

            if (inContainer)
            {
                // A. host.docker.internal çözülebiliyor mu?
                try
                {
                    var entry = System.Net.Dns.GetHostEntry("host.docker.internal");
                    if (entry.AddressList.Length > 0)
                    {
                        return _cachedResolvedLoopback = "host.docker.internal";
                    }
                }
                catch { }

                // B. Docker bridge varsayılan host gateway (172.17.0.1 vb.)
                try
                {
                    var gateway = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
                        .Where(n => n.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up)
                        .SelectMany(n => n.GetIPProperties().GatewayAddresses)
                        .Select(g => g.Address)
                        .FirstOrDefault(a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);

                    if (gateway != null)
                    {
                        return _cachedResolvedLoopback = gateway.ToString();
                    }
                }
                catch { }
            }

            return _cachedResolvedLoopback = "localhost";
        }
    }

    private static string ResolveHealthCheckUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            if (IsLoopbackHost(uri.Host))
            {
                string resolvedHost = ResolveContainerLoopback();
                if (resolvedHost != uri.Host)
                {
                    var builder = new UriBuilder(uri) { Host = resolvedHost };
                    return builder.Uri.ToString();
                }
            }
        }
        catch { }
        return url;
    }

    private static string ResolveHealthCheckHost(string host)
    {
        if (IsLoopbackHost(host))
        {
            return ResolveContainerLoopback();
        }
        return host;
    }

    private static string ExtractHost(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        raw = raw.Trim();
        if (raw.StartsWith("ping://", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw[7..];
        }
        else if (raw.Contains("://", StringComparison.Ordinal))
        {
            try
            {
                var uri = new Uri(raw);
                return uri.Host;
            }
            catch { }
        }

        int slashIdx = raw.IndexOf('/');
        if (slashIdx >= 0) raw = raw[..slashIdx];
        int colonIdx = raw.IndexOf(':');
        if (colonIdx >= 0) raw = raw[..colonIdx];
        return raw.Trim();
    }

    private async Task<(Service Service, UptimeCheck? Check, SslInfoHolder? Ssl)> CheckSingleServiceAsync(Service s, CancellationToken ct)
    {
        if (!s.IsUptimeEnabled || string.Equals(s.CheckType, "none", StringComparison.OrdinalIgnoreCase))
        {
            return (s, null, null);
        }

        if (s.Source == "docker" && s.Status == "down")
        {
            return (s, null, null);
        }

        string? targetUrl = !string.IsNullOrWhiteSpace(s.HealthCheckUrl) ? s.HealthCheckUrl : s.Url;
        bool isDockerCheck = string.Equals(s.CheckType, "docker", StringComparison.OrdinalIgnoreCase) ||
                             (s.Source == "docker" && string.IsNullOrWhiteSpace(targetUrl) && !string.Equals(s.CheckType, "tcp", StringComparison.OrdinalIgnoreCase) && !string.Equals(s.CheckType, "ping", StringComparison.OrdinalIgnoreCase));
        bool isPing = string.Equals(s.CheckType, "ping", StringComparison.OrdinalIgnoreCase) ||
                     (!string.IsNullOrWhiteSpace(targetUrl) && targetUrl.StartsWith("ping://", StringComparison.OrdinalIgnoreCase));
        bool isTcp = string.Equals(s.CheckType, "tcp", StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrWhiteSpace(targetUrl) && targetUrl.StartsWith("tcp://", StringComparison.OrdinalIgnoreCase));

        if (string.IsNullOrWhiteSpace(targetUrl) && !isTcp && !isDockerCheck && !isPing)
        {
            return (s, null, null);
        }

        var check = new UptimeCheck
        {
            ServiceId = s.Id,
            CheckedAt = DateTime.UtcNow.ToString("o")
        };

        var sw = Stopwatch.StartNew();
        SslInfoHolder? sslHolder = null;
        int maxRetries = Math.Max(0, s.MaxRetries ?? 1);
        int retryIntervalSec = Math.Max(1, s.RetryInterval ?? 30);
        int timeoutSeconds = Math.Max(1, s.TimeoutSeconds ?? 5);

        if (isDockerCheck)
        {
            bool isContainerRunning = false;
            string? containerStateDesc = null;

            try
            {
                using var scope = _services.CreateScope();
                var docker = scope.ServiceProvider.GetRequiredService<IDockerService>();
                var containers = await docker.GetContainersAsync(ct);
                var matched = containers.FirstOrDefault(c => 
                    (!string.IsNullOrEmpty(s.ContainerId) && (c.Id == s.ContainerId || c.Id.StartsWith(s.ContainerId[..Math.Min(12, s.ContainerId.Length)], StringComparison.OrdinalIgnoreCase))) ||
                    c.Names?.Any(n => n.TrimStart('/').Equals(s.Name, StringComparison.OrdinalIgnoreCase)) == true);

                sw.Stop();
                check.ResponseTimeMs = Math.Max(1, (int)sw.ElapsedMilliseconds);

                if (matched != null)
                {
                    isContainerRunning = string.Equals(matched.State, "running", StringComparison.OrdinalIgnoreCase);
                    containerStateDesc = matched.Status;
                }
                else
                {
                    isContainerRunning = false;
                    containerStateDesc = "Container Docker üzerinde bulunamadı";
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                check.ResponseTimeMs = (int)sw.ElapsedMilliseconds;
                isContainerRunning = false;
                containerStateDesc = ex.Message;
            }

            if (isContainerRunning)
            {
                check.Status = "up";
                check.ErrorMessage = null;
            }
            else
            {
                check.Status = "down";
                check.ErrorMessage = $"Docker: {containerStateDesc}";
            }

            return (s, check, null);
        }
        else if (isPing)
        {
            string host = ExtractHost(targetUrl ?? string.Empty);
            if (string.IsNullOrWhiteSpace(host))
            {
                host = "localhost";
            }
            string checkHost = ResolveHealthCheckHost(host);

            async Task<(bool Ok, long Rtt, string? Error)> TryPingAsync()
            {
                try
                {
                    using var ping = new Ping();
                    int timeoutMs = timeoutSeconds * 1000;
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(timeoutMs);

                    var reply = await ping.SendPingAsync(checkHost, timeoutMs);
                    if (reply.Status == IPStatus.Success)
                    {
                        return (true, reply.RoundtripTime, null);
                    }
                    return (false, reply.RoundtripTime, $"ICMP Ping: {reply.Status}");
                }
                catch (OperationCanceledException) when (!ct.IsCancellationRequested)
                {
                    return (false, 0, $"Zaman aşımı ({timeoutSeconds}s) - Ping yanıt vermedi ({checkHost})");
                }
                catch (Exception ex)
                {
                    return (false, 0, $"Ping hatası ({checkHost}): {ex.GetBaseException().Message}");
                }
            }

            var pingResult = await TryPingAsync();
            for (int r = 0; r < maxRetries && !pingResult.Ok && !ct.IsCancellationRequested; r++)
            {
                try { await Task.Delay(TimeSpan.FromSeconds(Math.Min(retryIntervalSec, 30)), ct); } catch (OperationCanceledException) { break; }
                if (!ct.IsCancellationRequested)
                {
                    pingResult = await TryPingAsync();
                }
            }

            sw.Stop();
            check.ResponseTimeMs = pingResult.Ok
                ? Math.Max(1, (int)pingResult.Rtt)
                : (int)sw.ElapsedMilliseconds;

            if (pingResult.Ok)
            {
                check.Status = "up";
            }
            else
            {
                check.Status = "down";
                check.ErrorMessage = pingResult.Error ?? "Bilinmeyen ICMP hatası";
            }

            return (s, check, null);
        }
        else if (isTcp)
        {
            string host = "localhost";
            int port = s.Port ?? 80;

            if (!string.IsNullOrWhiteSpace(targetUrl))
            {
                try
                {
                    var cleanUrl = targetUrl.StartsWith("tcp://", StringComparison.OrdinalIgnoreCase)
                        ? targetUrl.Replace("tcp://", "http://", StringComparison.OrdinalIgnoreCase)
                        : (targetUrl.Contains("://") ? targetUrl : $"http://{targetUrl}");
                    var uri = new Uri(cleanUrl);
                    host = uri.Host;
                    if (uri.Port > 0) port = uri.Port;
                }
                catch
                {
                    host = targetUrl.Split(':')[0];
                }
            }

            string checkHost = ResolveHealthCheckHost(host);

            async Task<Exception?> TryConnectTcpAsync()
            {
                try
                {
                    using var tcp = new TcpClient();
                    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));
                    await tcp.ConnectAsync(checkHost, port, cts.Token);
                    return null;
                }
                catch (Exception ex)
                {
                    return ex;
                }
            }

            var tcpEx = await TryConnectTcpAsync();
            for (int r = 0; r < maxRetries && tcpEx != null && !ct.IsCancellationRequested; r++)
            {
                try { await Task.Delay(TimeSpan.FromSeconds(Math.Min(retryIntervalSec, 30)), ct); } catch (OperationCanceledException) { break; }
                if (!ct.IsCancellationRequested)
                {
                    tcpEx = await TryConnectTcpAsync();
                }
            }

            sw.Stop();
            check.ResponseTimeMs = (int)sw.ElapsedMilliseconds;

            if (tcpEx == null)
            {
                check.Status = "up";
            }
            else
            {
                check.Status = "down";
                check.ErrorMessage = $"TCP bağlantı hatası ({host}:{port}): {tcpEx.Message}";
            }
        }
        else
        {
            targetUrl = NormalizeHttpUrl(targetUrl!);
            string internalCheckUrl = ResolveHealthCheckUrl(targetUrl);
            sslHolder = new SslInfoHolder();

            async Task<(bool Ok, string? Error)> TrySendHttpAsync()
            {
                var method = new HttpMethod(string.IsNullOrWhiteSpace(s.HttpMethod) ? "GET" : s.HttpMethod.Trim().ToUpperInvariant());
                using var request = new HttpRequestMessage(method, internalCheckUrl);
                try
                {
                    // Reverse proxy veya Virtual Host etiketleri için orijinal Host başlığını koru
                    request.Headers.Host = new Uri(targetUrl).Authority;
                }
                catch { }

                request.Options.Set(SslInfoKey, sslHolder);
                request.Options.Set(IgnoreTlsKey, s.IgnoreTls);

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

                try
                {
                    using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                    int code = (int)response.StatusCode;
                    bool isAccepted = StatusCodeMatcher.IsMatch(code, s.AcceptedStatusCodes);
                    if (!isAccepted)
                    {
                        return (false, $"HTTP {code}");
                    }

                    if (!string.IsNullOrWhiteSpace(s.ExpectedBody))
                    {
                        var (bodyOk, bodyError) = await HttpBodyValidator.ValidateAsync(response.Content, s.ExpectedBody, cts.Token);
                        if (!bodyOk)
                        {
                            return (false, bodyError);
                        }
                    }

                    return (true, null);
                }
                catch (OperationCanceledException) when (!ct.IsCancellationRequested)
                {
                    return (false, $"Zaman aşımı ({timeoutSeconds}s) - Hedefe ulaşılamadı ({internalCheckUrl})");
                }
                catch (Exception ex)
                {
                    return (false, ex.Message);
                }
            }

            var httpResult = await TrySendHttpAsync();
            for (int r = 0; r < maxRetries && !httpResult.Ok && !ct.IsCancellationRequested; r++)
            {
                try { await Task.Delay(TimeSpan.FromSeconds(Math.Min(retryIntervalSec, 30)), ct); } catch (OperationCanceledException) { break; }
                if (!ct.IsCancellationRequested)
                {
                    httpResult = await TrySendHttpAsync();
                }
            }

            sw.Stop();
            check.ResponseTimeMs = (int)sw.ElapsedMilliseconds;

            if (httpResult.Ok)
            {
                check.Status = "up";
            }
            else
            {
                check.Status = "down";
                check.ErrorMessage = httpResult.Error ?? "Bilinmeyen HTTP hatası";
            }
        }

        return (s, check, sslHolder);
    }

    public override void Dispose()
    {
        _httpClient.Dispose();
        base.Dispose();
    }
}
