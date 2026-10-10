using System.Diagnostics;
using System.Net.NetworkInformation;

namespace Corvus.Api.Services.Uptime.Checkers;

public record PingCheckResult(bool IsUp, int ResponseTimeMs, string? ErrorMessage);

public static class PingProtocolChecker
{
    public static async Task<PingCheckResult> CheckAsync(string? targetUrl, int timeoutSeconds, int maxRetries, int retryIntervalSec, CancellationToken ct)
    {
        string host = NetworkAddressResolver.ExtractHost(targetUrl ?? string.Empty);
        if (string.IsNullOrWhiteSpace(host))
        {
            host = "localhost";
        }
        string checkHost = NetworkAddressResolver.ResolveHealthCheckHost(host);

        var sw = Stopwatch.StartNew();

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
        int rtt = pingResult.Ok
            ? Math.Max(1, (int)pingResult.Rtt)
            : (int)sw.ElapsedMilliseconds;

        return new PingCheckResult(
            IsUp: pingResult.Ok,
            ResponseTimeMs: rtt,
            ErrorMessage: pingResult.Ok ? null : (pingResult.Error ?? "Bilinmeyen ICMP hatası"));
    }
}
