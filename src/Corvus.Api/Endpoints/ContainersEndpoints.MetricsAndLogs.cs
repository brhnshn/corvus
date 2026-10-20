using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

public static partial class ContainersEndpoints
{
    private static void MapMetricsAndLogsEndpoints(RouteGroupBuilder group)
    {
        group.MapPost("/prune", async (DockerPruneRequest request, IDockerService docker, CancellationToken ct) =>
        {
            var result = await docker.ExecuteSystemPruneAsync(request, ct);
            return Results.Json(result, CorvusJsonSerializerContext.Default.DockerPruneResult);
        }).RequireAdmin();

        group.MapGet("/system-df", async (IDockerService docker, CancellationToken ct) =>
        {
            var df = await docker.GetSystemDiskUsageAsync(ct);
            return df != null 
                ? Results.Json(df, CorvusJsonSerializerContext.Default.DockerSystemDfResponse)
                : Results.Json(new GenericApiResponse(false, "Docker disk kullanım analizi alınamadı."), CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 500);
        }).RequireAdmin();

        group.MapPost("/prune/selective", async (DockerSelectivePruneRequest request, IDockerService docker, CancellationToken ct) =>
        {
            var result = await docker.ExecuteSelectivePruneAsync(request, ct);
            return Results.Json(result, CorvusJsonSerializerContext.Default.DockerSelectivePruneResult);
        }).RequireAdmin();

        group.MapGet("/stats-summary", async (
            HttpContext httpContext,
            IDockerService docker,
            ITelemetryRingBuffer ringBuffer,
            ISystemRepository systemRepo,
            CancellationToken ct) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedSystemId))
            {
                requestedSystemId = httpContext.Request.Query["systemId"].FirstOrDefault();
            }
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId != "local-host")
            {
                var edgeContainers = ringBuffer.GetCachedContainers(systemId);
                if (edgeContainers.Count == 0)
                {
                    edgeContainers = await systemRepo.GetCachedContainersAsync(systemId);
                }

                var statsDict = new Dictionary<string, ContainerStatsDto>();
                foreach (var c in edgeContainers)
                {
                    if (string.IsNullOrWhiteSpace(c.ContainerId)) continue;
                    statsDict[c.ContainerId] = new ContainerStatsDto(
                        ContainerId: c.ContainerId,
                        CpuPercent: c.CpuPercent,
                        MemoryUsageBytes: c.MemoryBytes,
                        MemoryLimitBytes: 0,
                        MemoryPercent: 0,
                        NetworkRxBytes: 0,
                        NetworkTxBytes: 0
                    );
                }
                return Results.Json(statsDict, CorvusJsonSerializerContext.Default.DictionaryStringContainerStatsDto);
            }

            var summary = await docker.GetActiveContainersStatsSummaryAsync(ct);
            return Results.Ok(summary);
        });

        group.MapGet("/{id}/stats", async (
            string id, 
            IDockerService docker, 
            ITelemetryRingBuffer ringBuffer,
            ISystemRepository systemRepo,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId != "local-host")
            {
                var edgeContainers = ringBuffer.GetCachedContainers(systemId);
                if (edgeContainers.Count == 0)
                {
                    edgeContainers = await systemRepo.GetCachedContainersAsync(systemId);
                }
                var match = edgeContainers.FirstOrDefault(c => c.ContainerId.Equals(id, StringComparison.OrdinalIgnoreCase) 
                    || (!string.IsNullOrEmpty(c.ContainerId) && c.ContainerId.StartsWith(id, StringComparison.OrdinalIgnoreCase)));
                if (match != null)
                {
                    var dto = new ContainerStatsDto(
                        ContainerId: match.ContainerId,
                        CpuPercent: match.CpuPercent,
                        MemoryUsageBytes: match.MemoryBytes,
                        MemoryLimitBytes: 0,
                        MemoryPercent: 0,
                        NetworkRxBytes: 0,
                        NetworkTxBytes: 0
                    );
                    return Results.Json(dto, CorvusJsonSerializerContext.Default.ContainerStatsDto);
                }
                return Results.NotFound(new GenericApiResponse(false, "Stats alınamadı veya container çalışmıyor."));
            }

            var stats = await docker.GetContainerStatsAsync(id, ct);
            return stats != null 
                ? Results.Ok(stats) 
                : Results.NotFound(new GenericApiResponse(false, "Stats alınamadı veya container çalışmıyor."));
        });

        group.MapGet("/{id}/logs", async (
            string id, 
            int? tail, 
            IDockerService docker, 
            ISystemTunnelManager tunnelManager,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            int limit = tail.GetValueOrDefault(100);
            if (limit <= 0) limit = 100;
            if (limit > 1000) limit = 1000;

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "logs", ContainerId: id, TailLines: limit));
                if (rpcResp.Success && rpcResp.Logs != null)
                {
                    return Results.Json(new ContainerLogsDto(id, rpcResp.Logs), CorvusJsonSerializerContext.Default.ContainerLogsDto);
                }
                return Results.Json(new ContainerLogsDto(id, new List<string> { rpcResp.Message ?? "Uç sunucudan loglar alınamadı." }), CorvusJsonSerializerContext.Default.ContainerLogsDto);
            }

            var lines = await docker.GetContainerLogsAsync(id, limit, ct);
            return Results.Json(new ContainerLogsDto(id, lines), CorvusJsonSerializerContext.Default.ContainerLogsDto);
        });

        group.MapGet("/{id}/logs/stream", async (string id, int? tail, HttpContext context, IDockerService docker, CancellationToken ct) =>
        {
            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers.Connection = "keep-alive";

            async Task WriteSseLineAsync(string rawLine)
            {
                var subLines = rawLine.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
                foreach (var subLine in subLines)
                {
                    await context.Response.WriteAsync($"data: {subLine}\n", ct);
                }
                await context.Response.WriteAsync("\n", ct);
            }

            int limit = tail.GetValueOrDefault(50);
            var initialLines = await docker.GetContainerLogsAsync(id, limit, ct);
            var seenLines = new HashSet<string>(initialLines);

            foreach (var line in initialLines)
            {
                await WriteSseLineAsync(line);
            }
            await context.Response.Body.FlushAsync(ct);

            while (!ct.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(2000, ct);
                    var latest = await docker.GetContainerLogsAsync(id, 50, ct);
                    if (latest.Count > 0)
                    {
                        var newLines = new List<string>();
                        foreach (var line in latest)
                        {
                            if (seenLines.Add(line))
                            {
                                newLines.Add(line);
                            }
                        }

                        if (newLines.Count > 0)
                        {
                            foreach (var line in newLines)
                            {
                                await WriteSseLineAsync(line);
                            }
                            await context.Response.Body.FlushAsync(ct);
                        }

                        // Bellek şişmesini engelle: 1000'i geçerse en son satırları koru
                        if (seenLines.Count > 1000)
                        {
                            seenLines.Clear();
                            foreach (var line in latest)
                            {
                                seenLines.Add(line);
                            }
                        }
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        });
    }
}
