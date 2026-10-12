using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Agent.Models;

namespace Corvus.Agent.Services;

public interface IAgentTunnelClient
{
    Task RunTunnelAsync(string hubUrl, string nodeKey, CancellationToken ct);
}

public class AgentTunnelClient : IAgentTunnelClient
{
    private readonly ISystemMetricCollector _metricCollector;
    private readonly IAgentDockerClient _dockerClient;

    public AgentTunnelClient(
        ISystemMetricCollector metricCollector,
        IAgentDockerClient dockerClient)
    {
        _metricCollector = metricCollector;
        _dockerClient = dockerClient;
    }

    public async Task RunTunnelAsync(string hubUrl, string nodeKey, CancellationToken ct)
    {
        // Hub URL formatlama (http -> ws, https -> wss)
        string baseWsUrl = hubUrl.Trim().TrimEnd('/');
        if (baseWsUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            baseWsUrl = "wss://" + baseWsUrl[8..];
        }
        else if (baseWsUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
        {
            baseWsUrl = "ws://" + baseWsUrl[7..];
        }

        string fullWsUrl = $"{baseWsUrl}/api/v1/agent/tunnel";

        int backoffSeconds = 2;
        var rng = new Random();

        while (!ct.IsCancellationRequested)
        {
            using var ws = new ClientWebSocket();
            ws.Options.SetRequestHeader("Authorization", $"Bearer {nodeKey}");

            try
            {
                Console.WriteLine($"[Corvus Agent] Hub'a bağlanılıyor: {fullWsUrl}...");
                await ws.ConnectAsync(new Uri(fullWsUrl), ct);
                Console.WriteLine("[Corvus Agent] Bağlantı başarılı! Canlı telemetri akışı başlatıldı.");

                // Bağlantı başarılı olduğunda backoff'u sıfırla
                backoffSeconds = 2;

                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);

                // 1. Telemetri gönderim döngüsü (Her 3 saniyede bir)
                var sendTask = RunSendTelemetryLoopAsync(ws, linkedCts.Token);

                // 2. Mesaj ve RPC dinleme döngüsü
                var receiveTask = RunReceiveLoopAsync(ws, linkedCts.Token);

                await Task.WhenAny(sendTask, receiveTask);
                linkedCts.Cancel();
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Corvus Agent] Tünel bağlantı kesintisi: {ex.Message}");
            }

            // Jitter destekli üstel geri çekilme (2s -> 60s)
            int jitterMs = rng.Next(-500, 500);
            int delayMs = Math.Max(1000, (backoffSeconds * 1000) + jitterMs);
            Console.WriteLine($"[Corvus Agent] {delayMs / 1000.0:F1}s sonra yeniden bağlanılacak...");

            try
            {
                await Task.Delay(delayMs, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            backoffSeconds = Math.Min(60, backoffSeconds * 2);
        }
    }

    private async Task RunSendTelemetryLoopAsync(ClientWebSocket ws, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested && ws.State == WebSocketState.Open)
        {
            try
            {
                var metrics = _metricCollector.CollectMetrics();
                var containers = await _dockerClient.GetContainersAsync(ct);

                var payload = new AgentTelemetryPayload(
                    CpuPercent: metrics.CpuPercent,
                    CpuCores: metrics.CpuCores,
                    RamUsedBytes: metrics.RamUsedBytes,
                    RamTotalBytes: metrics.RamTotalBytes,
                    DiskUsedBytes: metrics.DiskUsedBytes,
                    DiskTotalBytes: metrics.DiskTotalBytes,
                    NetRxBytesSec: metrics.NetRxBytesSec,
                    NetTxBytesSec: metrics.NetTxBytesSec,
                    LoadAvg1m: metrics.LoadAvg1m,
                    LoadAvg5m: metrics.LoadAvg5m,
                    LoadAvg15m: metrics.LoadAvg15m,
                    Containers: containers
                );

                var message = new AgentTunnelMessage(
                    Type: "telemetry",
                    CorrelationId: null,
                    Telemetry: payload
                );

                byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(message, AgentJsonSerializerContext.Default.AgentTunnelMessage);
                await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, ct);

                await Task.Delay(TimeSpan.FromSeconds(3), ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Corvus Agent] Telemetri gönderim hatası: {ex.Message}");
                break;
            }
        }
    }

    private async Task RunReceiveLoopAsync(ClientWebSocket ws, CancellationToken ct)
    {
        var buffer = new byte[64 * 1024];

        while (!ct.IsCancellationRequested && ws.State == WebSocketState.Open)
        {
            try
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    string json = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    var msg = JsonSerializer.Deserialize(json, AgentJsonSerializerContext.Default.AgentTunnelMessage);

                    if (msg?.Type == "docker_req" && msg.DockerReq != null && !string.IsNullOrWhiteSpace(msg.CorrelationId))
                    {
                        var resp = await _dockerClient.ExecuteRpcActionAsync(msg.DockerReq, ct);

                        var resMsg = new AgentTunnelMessage(
                            Type: "docker_res",
                            CorrelationId: msg.CorrelationId,
                            Telemetry: null,
                            DockerReq: null,
                            DockerRes: resp
                        );

                        byte[] resBytes = JsonSerializer.SerializeToUtf8Bytes(resMsg, AgentJsonSerializerContext.Default.AgentTunnelMessage);
                        await ws.SendAsync(new ArraySegment<byte>(resBytes), WebSocketMessageType.Text, true, ct);
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Corvus Agent] Mesaj alma hatası: {ex.Message}");
                break;
            }
        }
    }
}
