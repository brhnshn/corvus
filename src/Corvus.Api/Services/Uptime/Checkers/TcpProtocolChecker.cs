using System.Diagnostics;
using System.Net.Sockets;

namespace Corvus.Api.Services.Uptime.Checkers;

public record TcpCheckResult(bool IsUp, int ResponseTimeMs, string? ErrorMessage);

public static class TcpProtocolChecker
{
    public static async Task<TcpCheckResult> CheckAsync(string? targetUrl, int? configuredPort, int timeoutSeconds, int maxRetries, int retryIntervalSec, CancellationToken ct)
    {
        string host = "localhost";
        int port = configuredPort ?? 80;

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

        string checkHost = NetworkAddressResolver.ResolveHealthCheckHost(host);
        var sw = Stopwatch.StartNew();

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
        int elapsed = (int)sw.ElapsedMilliseconds;

        return new TcpCheckResult(
            IsUp: tcpEx == null,
            ResponseTimeMs: elapsed,
            ErrorMessage: tcpEx == null ? null : $"TCP bağlantı hatası ({host}:{port}): {tcpEx.Message}");
    }
}
