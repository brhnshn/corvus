using System.Diagnostics;
using Corvus.Api.Models;
using Corvus.Api.Utils;

namespace Corvus.Api.Services.Uptime.Checkers;

public class SslInfoHolder
{
    public int? SslDays { get; set; }
    public string? SslIssuer { get; set; }
}

public record HttpCheckResult(bool IsUp, int ResponseTimeMs, string? ErrorMessage, SslInfoHolder Ssl);

public static class HttpProtocolChecker
{
    public static readonly HttpRequestOptionsKey<SslInfoHolder> SslInfoKey = new("Corvus_SslInfo");
    public static readonly HttpRequestOptionsKey<bool> IgnoreTlsKey = new("Corvus_IgnoreTls");

    public static async Task<HttpCheckResult> CheckAsync(
        HttpClient httpClient, 
        Service service, 
        string targetUrl, 
        int timeoutSeconds, 
        int maxRetries, 
        int retryIntervalSec, 
        CancellationToken ct)
    {
        string normalizedUrl = NetworkAddressResolver.NormalizeHttpUrl(targetUrl);
        string internalCheckUrl = NetworkAddressResolver.ResolveHealthCheckUrl(normalizedUrl);
        var sslHolder = new SslInfoHolder();
        var sw = Stopwatch.StartNew();

        async Task<(bool Ok, string? Error)> TrySendHttpAsync()
        {
            var method = new HttpMethod(string.IsNullOrWhiteSpace(service.HttpMethod) ? "GET" : service.HttpMethod.Trim().ToUpperInvariant());
            using var request = new HttpRequestMessage(method, internalCheckUrl);
            try
            {
                request.Headers.Host = new Uri(normalizedUrl).Authority;
            }
            catch { }

            request.Options.Set(SslInfoKey, sslHolder);
            request.Options.Set(IgnoreTlsKey, service.IgnoreTls);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

            try
            {
                using var response = await httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                int code = (int)response.StatusCode;
                bool isAccepted = StatusCodeMatcher.IsMatch(code, service.AcceptedStatusCodes);
                if (!isAccepted)
                {
                    return (false, $"HTTP {code}");
                }

                if (!string.IsNullOrWhiteSpace(service.ExpectedBody))
                {
                    var (bodyOk, bodyError) = await HttpBodyValidator.ValidateAsync(response.Content, service.ExpectedBody, cts.Token);
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
        int elapsed = (int)sw.ElapsedMilliseconds;

        return new HttpCheckResult(
            IsUp: httpResult.Ok,
            ResponseTimeMs: elapsed,
            ErrorMessage: httpResult.Ok ? null : (httpResult.Error ?? "Bilinmeyen HTTP hatası"),
            Ssl: sslHolder);
    }
}
