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

// Protokol bazlı tekil servis denetimi (Docker, ICMP, TCP, HTTP) ve push monitör periyot kontrolü
public partial class UptimeCheckerService
{
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

        int maxRetries = Math.Max(0, s.MaxRetries ?? 1);
        int retryIntervalSec = Math.Max(1, s.RetryInterval ?? 30);
        int timeoutSeconds = Math.Max(1, s.TimeoutSeconds ?? 5);

        if (isDockerCheck)
        {
            var sw = Stopwatch.StartNew();
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
            var pingRes = await PingProtocolChecker.CheckAsync(targetUrl, timeoutSeconds, maxRetries, retryIntervalSec, ct);
            check.ResponseTimeMs = pingRes.ResponseTimeMs;
            check.Status = pingRes.IsUp ? "up" : "down";
            check.ErrorMessage = pingRes.ErrorMessage;
            return (s, check, null);
        }
        else if (isTcp)
        {
            var tcpRes = await TcpProtocolChecker.CheckAsync(targetUrl, s.Port, timeoutSeconds, maxRetries, retryIntervalSec, ct);
            check.ResponseTimeMs = tcpRes.ResponseTimeMs;
            check.Status = tcpRes.IsUp ? "up" : "down";
            check.ErrorMessage = tcpRes.ErrorMessage;
            return (s, check, null);
        }
        else
        {
            var httpRes = await HttpProtocolChecker.CheckAsync(_httpClient, s, targetUrl!, timeoutSeconds, maxRetries, retryIntervalSec, ct);
            check.ResponseTimeMs = httpRes.ResponseTimeMs;
            check.Status = httpRes.IsUp ? "up" : "down";
            check.ErrorMessage = httpRes.ErrorMessage;
            return (s, check, httpRes.Ssl);
        }
    }

    // 3. Dead Man's Snitch — Beklenen Periyot Kontrolü (Önbellekli okuma)
    private async Task CheckPushMonitorsAsync(DateTime now, CancellationToken stoppingToken)
    {
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
                        $"Token: {SecuritySanitizer.MaskToken(pm.Token)}",
                        isDown: true,
                        $"Periyot süresi aşıldı! Son sinyal: {pm.LastSeenAt}",
                        stoppingToken);

                    _eventBroadcaster.Broadcast("snitch_status_changed", $"{{\"id\":\"{pm.Id}\",\"status\":\"down\"}}");
                }
            }
        }
    }
}
