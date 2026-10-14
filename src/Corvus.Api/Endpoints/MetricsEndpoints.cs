using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

public static class MetricsEndpoints
{
    public static void MapMetricsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/metrics")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/system", async (
            string? range, 
            IMetricsRepository repo,
            ITelemetryRingBuffer ringBuffer,
            ISystemMetricRepository systemMetricRepo,
            HttpContext httpContext) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedSystemId))
            {
                requestedSystemId = httpContext.Request.Query["systemId"].FirstOrDefault();
            }
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId == "local-host")
            {
                var metrics = await repo.GetRecentAsync(range ?? "24h");
                return Results.Ok(metrics);
            }
            else
            {
                int hours = (range ?? "24h") switch
                {
                    "1h" => 1,
                    "6h" => 6,
                    "12h" => 12,
                    "24h" => 24,
                    "7d" => 168,
                    "30d" => 720,
                    _ => 24
                };
                string since = DateTime.UtcNow.AddHours(-hours).ToString("o");
                var history1m = await systemMetricRepo.Get1mHistoryAsync(systemId, since, limit: 1440);
                var list = new List<SystemMetric>(history1m.Count);
                foreach (var h in history1m)
                {
                    list.Add(new SystemMetric
                    {
                        RecordedAt = h.RecordedAt,
                        CpuPercent = h.CpuPercent,
                        RamUsedMb = h.RamUsedBytes / (1024 * 1024),
                        RamTotalMb = h.RamTotalBytes / (1024 * 1024),
                        DiskUsedGb = h.DiskUsedBytes / (1024 * 1024 * 1024),
                        DiskTotalGb = h.DiskTotalBytes / (1024 * 1024 * 1024),
                        NetworkRxBytes = h.NetworkRxBytesSec,
                        NetworkTxBytes = h.NetworkTxBytesSec
                    });
                }
                if (list.Count == 0)
                {
                    var pts = ringBuffer.GetRecentPoints(systemId, 60);
                    foreach (var pt in pts)
                    {
                        list.Add(new SystemMetric
                        {
                            RecordedAt = DateTimeOffset.FromUnixTimeSeconds(pt.TimestampUnixSeconds).UtcDateTime.ToString("o"),
                            CpuPercent = pt.CpuPercent,
                            RamUsedMb = pt.RamUsedBytes / (1024 * 1024),
                            RamTotalMb = pt.RamTotalBytes / (1024 * 1024),
                            DiskUsedGb = pt.DiskUsedBytes / (1024 * 1024 * 1024),
                            DiskTotalGb = pt.DiskTotalBytes / (1024 * 1024 * 1024),
                            NetworkRxBytes = pt.NetRxBytesSec,
                            NetworkTxBytes = pt.NetTxBytesSec
                        });
                    }
                }
                return Results.Ok(list);
            }
        });

        group.MapGet("/latest", async (
            IMetricsRepository repo,
            ITelemetryRingBuffer ringBuffer,
            HttpContext httpContext) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedSystemId))
            {
                requestedSystemId = httpContext.Request.Query["systemId"].FirstOrDefault();
            }
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId == "local-host")
            {
                var latest = await repo.GetLatestAsync();
                return latest != null ? Results.Ok(latest) : Results.NotFound();
            }
            else
            {
                var pts = ringBuffer.GetRecentPoints(systemId, 1);
                if (pts.Count > 0)
                {
                    var pt = pts[0];
                    var m = new SystemMetric
                    {
                        RecordedAt = DateTimeOffset.FromUnixTimeSeconds(pt.TimestampUnixSeconds).UtcDateTime.ToString("o"),
                        CpuPercent = pt.CpuPercent,
                        RamUsedMb = pt.RamUsedBytes / (1024 * 1024),
                        RamTotalMb = pt.RamTotalBytes / (1024 * 1024),
                        DiskUsedGb = pt.DiskUsedBytes / (1024 * 1024 * 1024),
                        DiskTotalGb = pt.DiskTotalBytes / (1024 * 1024 * 1024),
                        NetworkRxBytes = pt.NetRxBytesSec,
                        NetworkTxBytes = pt.NetTxBytesSec
                    };
                    return Results.Ok(m);
                }
                return Results.NotFound();
            }
        });

        // Canlı Telemetri SSE Akışı (/api/metrics/stream)
        group.MapGet("/stream", async (
            HttpContext context,
            ITelemetryRingBuffer ringBuffer,
            CancellationToken ct) =>
        {
            string? requestedSystemId = context.Request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedSystemId))
            {
                requestedSystemId = context.Request.Query["systemId"].FirstOrDefault();
            }
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

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
                await foreach (var pt in ringBuffer.StreamAsync(systemId, linkedCts.Token))
                {
                    var containers = ringBuffer.GetCachedContainers(systemId);
                    int activeCount = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

                    var dto = new SystemTelemetryStreamDto(
                        SystemId: systemId,
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
