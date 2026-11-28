using System.Buffers;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

public static class AgentTunnelEndpoints
{
    private static readonly TimeSpan ReceiveIdleTimeout = TimeSpan.FromSeconds(90);
    private const int MaxMessageBytes = 1024 * 1024;

    public static void MapAgentTunnelEndpoints(this IEndpointRouteBuilder app)
    {
        // Outbound WSS tunnel endpoint: Uç sunucudaki ajan buraya bağlanır
        app.Map("/api/v1/agent/tunnel", async (
            HttpContext context,
            ISystemAuthService authService,
            ISystemRepository systemRepo,
            IServiceScopeFactory scopeFactory,
            ITelemetryRingBuffer ringBuffer,
            ISystemTunnelManager tunnelManager,
            ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("AgentTunnelEndpoints");

            if (!context.WebSockets.IsWebSocketRequest)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsync("WebSocket connection required.");
                return;
            }

            // 1. Authenticate Token from Authorization header or Query string
            string? authHeader = context.Request.Headers.Authorization.ToString();
            if (string.IsNullOrWhiteSpace(authHeader))
            {
                authHeader = context.Request.Query["token"].ToString();
            }

            var (isValid, system) = await authService.AuthenticateBearerTokenAsync(authHeader ?? "");
            if (!isValid || system == null)
            {
                logger.LogWarning("Agent tunnel el sıkışma reddedildi: Geçersiz veya iptal edilmiş token. IP: {Ip}",
                    context.Connection.RemoteIpAddress);
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            // 2. Accept WebSocket connection
            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
            string systemId = system.Id;

            tunnelManager.RegisterTunnel(systemId, webSocket);

            string clientIp = context.Connection.RemoteIpAddress?.ToString() ?? system.IpAddress ?? "";
            string nowUtc = DateTime.UtcNow.ToString("o");
            await systemRepo.UpdateStatusAsync(systemId, "online", nowUtc);

            logger.LogInformation("Agent tunnel açıldı: {SystemName} ({SystemId}) IP: {Ip}",
                system.Name, systemId, clientIp);

            // Sıfır-tahsisli (zero-allocation) ArrayPool bellek tamponu
            byte[] buffer = ArrayPool<byte>.Shared.Rent(64 * 1024);
            MemoryStream? fragmentStream = null;

            try
            {
                while (webSocket.State == WebSocketState.Open && !context.RequestAborted.IsCancellationRequested)
                {
                    using var receiveCts = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
                    receiveCts.CancelAfter(ReceiveIdleTimeout);

                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), receiveCts.Token);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        if (fragmentStream == null && result.EndOfMessage)
                        {
                            if (result.Count > 0)
                            {
                                // String nesnesi üretmeden doğrudan ReadOnlySpan<byte> üzerinden sıfır tahsisle ayrıştır
                                ProcessTextMessage(buffer.AsSpan(0, result.Count), systemId, ringBuffer, scopeFactory, tunnelManager, logger);
                            }
                            continue;
                        }

                        fragmentStream ??= new MemoryStream();
                        if (fragmentStream.Length + result.Count > MaxMessageBytes)
                        {
                            logger.LogWarning("Agent tunnel mesaj boyutu sınırı aşıldı ({SystemId}), bağlantı kapatılıyor.", systemId);
                            await webSocket.CloseAsync(WebSocketCloseStatus.MessageTooBig, "Message too large", CancellationToken.None);
                            break;
                        }

                        if (result.Count > 0)
                        {
                            fragmentStream.Write(buffer, 0, result.Count);
                        }

                        if (result.EndOfMessage)
                        {
                            if (fragmentStream.TryGetBuffer(out var seg) && seg.Count > 0)
                            {
                                ProcessTextMessage(seg.AsSpan(), systemId, ringBuffer, scopeFactory, tunnelManager, logger);
                            }
                            fragmentStream.SetLength(0);
                        }
                    }
                    else if (result.MessageType == WebSocketMessageType.Binary)
                    {
                        // Binary PTY framing for xterm.js (Opcode 0x01: Data, 0x02: Resize, 0x03: Close)
                        // Binary paketler terminal oturumuna iletilebilir
                    }
                }
            }
            catch (OperationCanceledException)
            {
                logger.LogInformation("Agent tunnel zaman aşımı veya iptal nedeniyle kapatıldı: {SystemId}", systemId);
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Agent tunnel bağlantı akışında hata: {SystemId}", systemId);
            }
            finally
            {
                fragmentStream?.Dispose();
                ArrayPool<byte>.Shared.Return(buffer);
                tunnelManager.UnregisterTunnel(systemId, webSocket);
                logger.LogInformation("Agent tunnel kapandı: {SystemId}", systemId);

                // Son görülme saatini koru, ancak durumu degraded/offline'a bırak
                try
                {
                    await systemRepo.UpdateStatusAsync(systemId, "degraded", DateTime.UtcNow.ToString("o"));
                }
                catch { }
            }
        });
    }

    private static void ProcessTextMessage(
        ReadOnlySpan<byte> utf8Json,
        string systemId,
        ITelemetryRingBuffer ringBuffer,
        IServiceScopeFactory scopeFactory,
        ISystemTunnelManager tunnelManager,
        ILogger logger)
    {
        try
        {
            var msg = JsonSerializer.Deserialize(utf8Json, CorvusJsonSerializerContext.Default.AgentTunnelMessage);
            if (msg == null) return;

            if (msg.Type == "telemetry" && msg.Telemetry != null)
            {
                var tel = msg.Telemetry;
                long unixSec = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

                var point = new SystemTelemetryPoint(
                    timestampUnixSeconds: unixSec,
                    cpuPercent: tel.CpuPercent,
                    cpuCores: tel.CpuCores,
                    ramUsedBytes: tel.RamUsedBytes,
                    ramTotalBytes: tel.RamTotalBytes,
                    diskUsedBytes: tel.DiskUsedBytes,
                    diskTotalBytes: tel.DiskTotalBytes,
                    netRxBytesSec: tel.NetRxBytesSec,
                    netTxBytesSec: tel.NetTxBytesSec,
                    loadAvg1m: tel.LoadAvg1m,
                    loadAvg5m: tel.LoadAvg5m,
                    loadAvg15m: tel.LoadAvg15m
                );

                ringBuffer.Push(systemId, in point, tel.Containers);

                // Uç sistem durumunu canlı güncelle (Scoped repository yeni scope içinde çözümlenir)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = scopeFactory.CreateScope();
                        var scopedRepo = scope.ServiceProvider.GetRequiredService<ISystemRepository>();
                        string nowIso = DateTime.UtcNow.ToString("o");
                        await scopedRepo.UpdateStatusAsync(systemId, "online", nowIso);

                        if (tel.Containers != null && tel.Containers.Count > 0)
                        {
                            await scopedRepo.UpsertContainersCacheAsync(systemId, tel.Containers);
                        }
                    }
                    catch { }
                });
            }
            else if (msg.Type == "docker_res" && !string.IsNullOrWhiteSpace(msg.CorrelationId) && msg.DockerRes != null)
            {
                tunnelManager.HandleRpcResponse(msg.CorrelationId, msg.DockerRes);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Agent mesajı ayrıştırılamadı.");
        }
    }
}
