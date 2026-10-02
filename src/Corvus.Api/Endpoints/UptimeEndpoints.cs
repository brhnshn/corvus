using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class UptimeEndpoints
{
    public static void MapUptimeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/uptime")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/", async (string service_id, string? range, IUptimeRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(service_id))
            {
                return Results.BadRequest("service_id parametresi gereklidir.");
            }

            var checks = await repo.GetByServiceAsync(service_id, range ?? "7d");
            return Results.Ok(checks);
        });

        group.MapGet("/{id}/daily-stats", async (string id, int? days, IUptimeRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return Results.BadRequest("id parametresi gereklidir.");
            }

            var stats = await repo.GetDailyStatsAsync(id, days ?? 30);
            return Results.Ok(stats);
        });

        group.MapPost("/test-connection", async (TestConnectionRequest req) =>
        {
            var sw = Stopwatch.StartNew();
            int timeoutSec = Math.Clamp(req.TimeoutSeconds ?? 5, 1, 30);
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSec));

            try
            {
                string checkType = req.CheckType?.ToLowerInvariant() ?? "http";

                if (checkType == "tcp")
                {
                    string host = "localhost";
                    int port = req.Port ?? 80;

                    if (!string.IsNullOrWhiteSpace(req.Url))
                    {
                        var trimmed = req.Url.Trim();
                        if (trimmed.StartsWith("tcp://", StringComparison.OrdinalIgnoreCase))
                        {
                            trimmed = trimmed[6..];
                        }
                        var parts = trimmed.Split(':');
                        host = parts[0];
                        if (parts.Length > 1 && int.TryParse(parts[1], out var parsedPort))
                        {
                            port = parsedPort;
                        }
                    }

                    using var tcpClient = new TcpClient();
                    await tcpClient.ConnectAsync(host, port, cts.Token);
                    sw.Stop();
                    return Results.Ok(new TestConnectionResponse(
                        true,
                        null,
                        sw.ElapsedMilliseconds,
                        $"TCP bağlantısı başarılı ({host}:{port})"
                    ));
                }
                else if (checkType == "ping")
                {
                    string target = req.Url?.Trim() ?? string.Empty;
                    if (string.IsNullOrWhiteSpace(target))
                    {
                        return Results.BadRequest(new TestConnectionResponse(
                            false,
                            null,
                            0,
                            "Ping testi için geçerli bir Host veya IP adresi belirtilmelidir."
                        ));
                    }

                    if (target.StartsWith("ping://", StringComparison.OrdinalIgnoreCase))
                    {
                        target = target[7..];
                    }
                    else if (target.Contains("://", StringComparison.Ordinal))
                    {
                        try { target = new Uri(target).Host; } catch { }
                    }
                    int slashIdx = target.IndexOf('/');
                    if (slashIdx >= 0) target = target[..slashIdx];
                    int colonIdx = target.IndexOf(':');
                    if (colonIdx >= 0) target = target[..colonIdx];
                    target = target.Trim();

                    using var ping = new Ping();
                    int timeoutMs = timeoutSec * 1000;
                    var reply = await ping.SendPingAsync(target, timeoutMs);
                    sw.Stop();

                    bool isOk = reply.Status == IPStatus.Success;
                    long rtt = isOk ? Math.Max(1, reply.RoundtripTime) : sw.ElapsedMilliseconds;

                    return Results.Ok(new TestConnectionResponse(
                        isOk,
                        null,
                        rtt,
                        isOk
                            ? $"ICMP Ping başarılı ({target}) - RTT: {rtt}ms"
                            : $"Ping başarısız ({target}): {reply.Status}"
                    ));
                }
                else
                {
                    // HTTP / HTTPS Test
                    string targetUrl = req.Url?.Trim() ?? string.Empty;
                    if (string.IsNullOrWhiteSpace(targetUrl))
                    {
                        if (req.Port.HasValue)
                        {
                            targetUrl = $"http://localhost:{req.Port.Value}";
                        }
                        else
                        {
                            return Results.BadRequest(new TestConnectionResponse(
                                false,
                                null,
                                0,
                                "Test için geçerli bir URL veya Port belirtilmelidir."
                            ));
                        }
                    }

                    if (!targetUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                        !targetUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    {
                        targetUrl = $"http://{targetUrl}";
                    }

                    var handler = new HttpClientHandler();
                    if (req.IgnoreTls ?? true)
                    {
                        handler.ServerCertificateCustomValidationCallback = (_, _, _, _) => true;
                    }

                    using var client = new HttpClient(handler)
                    {
                        Timeout = TimeSpan.FromSeconds(timeoutSec)
                    };

                    using var requestMessage = new HttpRequestMessage(HttpMethod.Get, targetUrl);
                    requestMessage.Headers.UserAgent.ParseAdd("Corvus-ConnectionTester/1.0");

                    var response = await client.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, cts.Token);
                    sw.Stop();

                    int statusCode = (int)response.StatusCode;
                    bool isOk = statusCode >= 200 && statusCode < 400;

                    return Results.Ok(new TestConnectionResponse(
                        isOk,
                        statusCode,
                        sw.ElapsedMilliseconds,
                        isOk
                            ? $"Bağlantı başarılı (HTTP {statusCode} {response.StatusCode})"
                            : $"Hedef sunucu yanıt verdi fakat durum kodu: HTTP {statusCode} {response.StatusCode}"
                    ));
                }
            }
            catch (OperationCanceledException)
            {
                sw.Stop();
                return Results.Ok(new TestConnectionResponse(
                    false,
                    null,
                    sw.ElapsedMilliseconds,
                    $"Bağlantı zaman aşımına uğradı ({timeoutSec}s)"
                ));
            }
            catch (SocketException ex)
            {
                sw.Stop();
                return Results.Ok(new TestConnectionResponse(
                    false,
                    null,
                    sw.ElapsedMilliseconds,
                    $"Soket hatası: {ex.Message}"
                ));
            }
            catch (Exception ex)
            {
                sw.Stop();
                return Results.Ok(new TestConnectionResponse(
                    false,
                    null,
                    sw.ElapsedMilliseconds,
                    $"Bağlantı hatası: {ex.Message}"
                ));
            }
        });
    }
}
