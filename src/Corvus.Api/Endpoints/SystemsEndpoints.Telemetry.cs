using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

// Uç sistem telemetri geçmişi ve canlı SSE metrik akışı
public static partial class SystemsEndpoints
{
    private static void MapSystemTelemetryEndpoints(RouteGroupBuilder group)
    {
        // 7. Telemetry Metrics History (live RAM or downsampled DB)
        group.MapGet("/{id}/metrics", async (
            string id,
            string? range,
            ITelemetryRingBuffer ringBuffer,
            ISystemMetricRepository metricRepo) =>
        {
            string r = (range ?? "live").ToLowerInvariant();

            if (r == "live")
            {
                var points = ringBuffer.GetRecentPoints(id, 60);
                var list = new List<SystemDownsampledPoint>(points.Count);
                for (int i = 0; i < points.Count; i++)
                {
                    var pt = points[i];
                    list.Add(new SystemDownsampledPoint(
                        Timestamp: DateTimeOffset.FromUnixTimeSeconds(pt.TimestampUnixSeconds).UtcDateTime.ToString("o"),
                        CpuPercent: Math.Round(pt.CpuPercent, 1),
                        RamUsedBytes: pt.RamUsedBytes,
                        DiskUsedBytes: pt.DiskUsedBytes,
                        RxBytesPerSec: pt.NetRxBytesSec,
                        TxBytesPerSec: pt.NetTxBytesSec
                    ));
                }
                return Results.Json(list, CorvusJsonSerializerContext.Default.ListSystemDownsampledPoint);
            }
            else if (r is "1h" or "24h" or "7d")
            {
                int hours = r switch
                {
                    "1h" => 1,
                    "24h" => 24,
                    _ => 168 // 7d
                };

                string since = DateTime.UtcNow.AddHours(-hours).ToString("o");
                var history1m = await metricRepo.Get1mHistoryAsync(id, since, limit: 1440);

                var list = new List<SystemDownsampledPoint>(history1m.Count);
                foreach (var h in history1m)
                {
                    list.Add(new SystemDownsampledPoint(
                        Timestamp: h.RecordedAt,
                        CpuPercent: h.CpuPercent,
                        RamUsedBytes: h.RamUsedBytes,
                        DiskUsedBytes: h.DiskUsedBytes,
                        RxBytesPerSec: h.NetworkRxBytesSec,
                        TxBytesPerSec: h.NetworkTxBytesSec
                    ));
                }
                return Results.Json(list, CorvusJsonSerializerContext.Default.ListSystemDownsampledPoint);
            }
            else // 30d
            {
                string since = DateTime.UtcNow.AddDays(-30).ToString("o");
                var history1h = await metricRepo.Get1hHistoryAsync(id, since, limit: 720);

                var list = new List<SystemDownsampledPoint>(history1h.Count);
                foreach (var h in history1h)
                {
                    list.Add(new SystemDownsampledPoint(
                        Timestamp: h.RecordedAt,
                        CpuPercent: h.CpuAvg,
                        RamUsedBytes: h.RamUsedAvg,
                        DiskUsedBytes: h.DiskUsedAvg,
                        RxBytesPerSec: h.NetworkRxTotal,
                        TxBytesPerSec: h.NetworkTxTotal
                    ));
                }
                return Results.Json(list, CorvusJsonSerializerContext.Default.ListSystemDownsampledPoint);
            }
        });

        // 11. Canlı Telemetri SSE Akışı (100ms Sync)
        group.MapGet("/{id}/stream", async (
            string id,
            HttpContext context,
            ITelemetryRingBuffer ringBuffer,
            CancellationToken ct) =>
        {
            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers["X-Accel-Buffering"] = "no";

            if (context.Request.Protocol.StartsWith("HTTP/1", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.Headers.Connection = "keep-alive";
            }

            var writeLock = new SemaphoreSlim(1, 1);

            async Task SendDataAsync(string data, CancellationToken token)
            {
                await writeLock.WaitAsync(token);
                try
                {
                    await context.Response.WriteAsync(data, token);
                    await context.Response.Body.FlushAsync(token);
                }
                catch (IOException)
                {
                }
                finally
                {
                    writeLock.Release();
                }
            }

            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            var pingTask = Task.Run(async () =>
            {
                while (!linkedCts.Token.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(15), linkedCts.Token);
                        await SendDataAsync(": ping\n\n", linkedCts.Token);
                    }
                    catch
                    {
                        break;
                    }
                }
            }, linkedCts.Token);

            try
            {
                await foreach (var pt in ringBuffer.StreamAsync(id, linkedCts.Token))
                {
                    var containers = ringBuffer.GetCachedContainers(id);
                    int activeCount = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

                    var dto = new SystemTelemetryStreamDto(
                        SystemId: id,
                        TimestampUnixSeconds: pt.TimestampUnixSeconds,
                        CpuPercent: (float)Math.Round(pt.CpuPercent, 1),
                        CpuCores: pt.CpuCores,
                        RamUsedBytes: pt.RamUsedBytes,
                        RamTotalBytes: pt.RamTotalBytes,
                        DiskUsedBytes: pt.DiskUsedBytes,
                        DiskTotalBytes: pt.DiskTotalBytes,
                        NetRxBytesSec: pt.NetRxBytesSec,
                        NetTxBytesSec: pt.NetTxBytesSec,
                        LoadAvg1m: pt.LoadAvg1m,
                        LoadAvg5m: pt.LoadAvg5m,
                        LoadAvg15m: pt.LoadAvg15m,
                        ActiveContainers: activeCount
                    );

                    string json = JsonSerializer.Serialize(dto, CorvusJsonSerializerContext.Default.SystemTelemetryStreamDto);
                    await SendDataAsync($"event: telemetry\ndata: {json}\n\n", linkedCts.Token);
                }
            }
            catch (OperationCanceledException)
            {
            }
            finally
            {
                linkedCts.Cancel();
                try { await pingTask; } catch { }
            }
        });
    }
}
