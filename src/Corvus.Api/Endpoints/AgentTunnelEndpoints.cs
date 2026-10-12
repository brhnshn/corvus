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
    public static void MapAgentTunnelEndpoints(this IEndpointRouteBuilder app)
    {
        // Outbound WSS tunnel endpoint: Uç sunucudaki ajan buraya bağlanır
        app.Map("/api/v1/agent/tunnel", async (
            HttpContext context,
            ISystemAuthService authService,
            ISystemRepository systemRepo,
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

            var buffer = new byte[64 * 1024]; // 64 KB buffer

            try
            {
                while (webSocket.State == WebSocketState.Open)
                {
                    var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                    if (result.MessageType == WebSocketMessageType.Close)
                    {
                        break;
                    }

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        string json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        ProcessTextMessage(json, systemId, ringBuffer, systemRepo, tunnelManager, logger);
                    }
                    else if (result.MessageType == WebSocketMessageType.Binary)
                    {
                        // Binary PTY framing for xterm.js (Opcode 0x01: Data, 0x02: Resize, 0x03: Close)
                        // Binary paketler terminal oturumuna iletilebilir
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogDebug(ex, "Agent tunnel bağlantı akışında hata: {SystemId}", systemId);
            }
            finally
            {
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
        string json,
        string systemId,
        ITelemetryRingBuffer ringBuffer,
        ISystemRepository systemRepo,
        ISystemTunnelManager tunnelManager,
        ILogger logger)
    {
        try
        {
            var msg = JsonSerializer.Deserialize(json, CorvusJsonSerializerContext.Default.AgentTunnelMessage);
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

                // Uç sistem durumunu canlı güncelle (Fire-and-forget task ile SQLite kilitlenmesini engelle)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        string nowIso = DateTime.UtcNow.ToString("o");
                        await systemRepo.UpdateStatusAsync(systemId, "online", nowIso);

                        if (tel.Containers != null && tel.Containers.Count > 0)
                        {
                            await systemRepo.UpsertContainersCacheAsync(systemId, tel.Containers);
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
