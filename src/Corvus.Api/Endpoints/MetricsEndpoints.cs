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

        group.MapGet("/system", async (string? range, IMetricsRepository repo) =>
        {
            var metrics = await repo.GetRecentAsync(range ?? "24h");
            return Results.Ok(metrics);
        });

        group.MapGet("/latest", async (IMetricsRepository repo) =>
        {
            var latest = await repo.GetLatestAsync();
            return latest != null ? Results.Ok(latest) : Results.NotFound();
        });

        // Canlı Telemetri SSE Akışı (/api/metrics/stream)
        group.MapGet("/stream", async (
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
                await foreach (var pt in ringBuffer.StreamAsync("local-host", linkedCts.Token))
                {
                    var containers = ringBuffer.GetCachedContainers("local-host");
                    int activeCount = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

                    var dto = new SystemTelemetryStreamDto(
                        SystemId: "local-host",
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
