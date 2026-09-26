using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.Sockets;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.BackgroundServices;

public class UptimeCheckerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<UptimeCheckerService> _logger;
    private readonly IEventBroadcaster _eventBroadcaster;
    private readonly ConcurrentDictionary<string, int> _consecutiveFailures = new();
    private readonly ConcurrentDictionary<string, bool> _alertedDown = new();
    private static readonly HttpRequestOptionsKey<SslInfoHolder> SslInfoKey = new("Corvus_SslInfo");
    private readonly HttpClient _httpClient;

    private class SslInfoHolder
    {
        public int? SslDays { get; set; }
        public string? SslIssuer { get; set; }
    }

    public UptimeCheckerService(
        IServiceProvider services, 
        ILogger<UptimeCheckerService> logger,
        IEventBroadcaster eventBroadcaster)
    {
        _services = services;
        _logger = logger;
        _eventBroadcaster = eventBroadcaster;

        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (message, cert, chain, errors) =>
            {
                if (message.Options.TryGetValue(SslInfoKey, out var holder) && cert != null)
                {
                    holder.SslDays = (int)Math.Max(0, (cert.NotAfter - DateTime.UtcNow).TotalDays);
                    holder.SslIssuer = cert.Issuer;
                }
                return true;
            }
        };

        _httpClient = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("UptimeCheckerService başlatıldı (Periyot: 60sn).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var servicesRepo = scope.ServiceProvider.GetRequiredService<IServicesRepository>();
                var uptimeRepo = scope.ServiceProvider.GetRequiredService<IUptimeRepository>();
                var notifService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                var pushRepo = scope.ServiceProvider.GetRequiredService<IPushMonitorRepository>();
                var settingsRepo = scope.ServiceProvider.GetRequiredService<ISettingsRepository>();

                // Bildirim ve durum eşiği (varsayılan: 2 ardışık kontrol hatası)
                int alertThreshold = 2;
                var thresholdSetting = await settingsRepo.GetAsync("uptime_alert_threshold");
                if (int.TryParse(thresholdSetting, out var parsedThreshold) && parsedThreshold >= 1)
                {
                    alertThreshold = parsedThreshold;
                }

                var allServices = await servicesRepo.GetAllAsync();

                // Uptime Kuma tarzı kontrollü eşzamanlılık (DNS/soket tükenmesini engellemek için)
                var checkResults = new ConcurrentBag<(Service Service, UptimeCheck? Check, SslInfoHolder? Ssl)>();
                var parallelOptions = new ParallelOptions
                {
                    MaxDegreeOfParallelism = 6,
                    CancellationToken = stoppingToken
                };

                await Parallel.ForEachAsync(allServices, parallelOptions, async (s, ct) =>
                {
                    var res = await CheckSingleServiceAsync(s, ct);
                    checkResults.Add(res);
                });

                foreach (var (s, check, sslHolder) in checkResults)
                {
                    if (check == null) continue;

                    if (sslHolder?.SslDays.HasValue == true)
                    {
                        await servicesRepo.UpdateSslInfoAsync(s.Id, sslHolder.SslDays.Value, sslHolder.SslIssuer);
                        if (sslHolder.SslDays.Value <= 14)
                        {
                            _logger.LogWarning("SSL sertifikası yakında bitiyor: Servis {ServiceName}, Kalan Gün: {Days}", s.Name, sslHolder.SslDays.Value);
                        }
                    }

                    await uptimeRepo.InsertAsync(check);

                    string? targetUrl = !string.IsNullOrWhiteSpace(s.HealthCheckUrl) ? s.HealthCheckUrl : s.Url;

                    if (check.Status == "down")
                    {
                        _consecutiveFailures.AddOrUpdate(s.Id, 1, (_, count) => count + 1);
                        int failures = _consecutiveFailures[s.Id];

                        // Uptime Kuma 3-State Machine Mantığı:
                        // Eşik değerine ulaşıldıysa -> Kesin DOWN
                        if (failures >= alertThreshold)
                        {
                            if (_alertedDown.TryAdd(s.Id, true))
                            {
                                _ = notifService.DispatchServiceAlertAsync(s.Name, targetUrl ?? $"Port:{s.Port}", isDown: true, check.ErrorMessage, stoppingToken);
                            }

                            await servicesRepo.UpdateStatusAsync(s.Id, "down");
                            _eventBroadcaster.Broadcast("service_status_changed", $"{{\"id\":\"{s.Id}\",\"status\":\"down\"}}");
                        }
                        else
                        {
                            // Henüz eşik aşılmadı -> Geçici aksaklık (PENDING / DEGRADED)
                            _logger.LogInformation("Servis {Name} geçici hata verdi ({Failures}/{Threshold}). Durum 'degraded' olarak işaretlendi.", s.Name, failures, alertThreshold);
                            await servicesRepo.UpdateStatusAsync(s.Id, "degraded");
                            _eventBroadcaster.Broadcast("service_status_changed", $"{{\"id\":\"{s.Id}\",\"status\":\"degraded\"}}");
                        }
                    }
                    else if (check.Status == "up")
                    {
                        _consecutiveFailures[s.Id] = 0;

                        // Önceden kesinti bildirimi gönderilmişse kurtarıldı bildirimi gönder
                        if (_alertedDown.TryRemove(s.Id, out _))
                        {
                            _ = notifService.DispatchServiceAlertAsync(s.Name, targetUrl ?? $"Port:{s.Port}", isDown: false, null, stoppingToken);
                        }

                        _eventBroadcaster.Broadcast("service_status_changed", $"{{\"id\":\"{s.Id}\",\"status\":\"healthy\"}}");
                        await servicesRepo.UpdateStatusAsync(s.Id, "healthy");
                    }
                }

                // 1.5: Dead Man's Snitch — Beklenen Periyot Kontrolü
                var pushMonitors = await pushRepo.GetAllAsync();
                foreach (var pm in pushMonitors)
                {
                    if (!string.IsNullOrEmpty(pm.LastSeenAt) && 
                        DateTime.TryParse(pm.LastSeenAt, null, System.Globalization.DateTimeStyles.RoundtripKind, out var lastSeen))
                    {
                        var allowedTime = TimeSpan.FromMinutes(pm.ExpectedIntervalMinutes + pm.GracePeriodMinutes);
                        if (DateTime.UtcNow - lastSeen.ToUniversalTime() > allowedTime && pm.Status != "down")
                        {
                            await pushRepo.UpdateStatusAsync(pm.Id, "down");
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
                await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
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

    private async Task<(Service Service, UptimeCheck? Check, SslInfoHolder? Ssl)> CheckSingleServiceAsync(Service s, CancellationToken ct)
    {
        if (string.Equals(s.CheckType, "none", StringComparison.OrdinalIgnoreCase))
        {
            return (s, null, null);
        }

        string? targetUrl = !string.IsNullOrWhiteSpace(s.HealthCheckUrl) ? s.HealthCheckUrl : s.Url;
        bool isDockerCheck = string.Equals(s.CheckType, "docker", StringComparison.OrdinalIgnoreCase) ||
                             (s.Source == "docker" && string.IsNullOrWhiteSpace(targetUrl) && !string.Equals(s.CheckType, "tcp", StringComparison.OrdinalIgnoreCase));
        bool isTcp = string.Equals(s.CheckType, "tcp", StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrWhiteSpace(targetUrl) && targetUrl.StartsWith("tcp://", StringComparison.OrdinalIgnoreCase));

        if (string.IsNullOrWhiteSpace(targetUrl) && !isTcp && !isDockerCheck)
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
                    cts.CancelAfter(TimeSpan.FromSeconds(5));
                    await tcp.ConnectAsync(checkHost, port, cts.Token);
                    return null;
                }
                catch (Exception ex)
                {
                    return ex;
                }
            }

            var tcpEx = await TryConnectTcpAsync();
            if (tcpEx != null && !ct.IsCancellationRequested)
            {
                // Hızlı tekrar deneme: Geçici aksamalarda 1 saniye sonra 1 kez daha dene
                try { await Task.Delay(1000, ct); } catch (OperationCanceledException) { }
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
                using var request = new HttpRequestMessage(HttpMethod.Get, internalCheckUrl);
                try
                {
                    // Reverse proxy veya Virtual Host etiketleri için orijinal Host başlığını koru
                    request.Headers.Host = new Uri(targetUrl).Authority;
                }
                catch { }

                request.Options.Set(SslInfoKey, sslHolder);
                try
                {
                    var response = await _httpClient.SendAsync(request, ct);
                    if (response.IsSuccessStatusCode)
                    {
                        return (true, null);
                    }
                    return (false, $"HTTP {(int)response.StatusCode}");
                }
                catch (Exception ex)
                {
                    return (false, ex.Message);
                }
            }

            var httpResult = await TrySendHttpAsync();
            if (!httpResult.Ok && !ct.IsCancellationRequested)
            {
                // Hızlı tekrar deneme: 1 saniye sonra 1 kez daha dene
                try { await Task.Delay(1000, ct); } catch (OperationCanceledException) { }
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
                string err = httpResult.Error ?? "Bilinmeyen HTTP hatası";
                if (err.Contains("configured HttpClient.Timeout", StringComparison.OrdinalIgnoreCase) ||
                    err.Contains("timed out", StringComparison.OrdinalIgnoreCase) ||
                    err.Contains("The operation was canceled", StringComparison.OrdinalIgnoreCase))
                {
                    err = $"Zaman aşımı (5s) - Hedefe ulaşılamadı ({internalCheckUrl})";
                }
                check.ErrorMessage = err;
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
