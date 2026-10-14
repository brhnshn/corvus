using System.Collections.Concurrent;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

public static class DashboardEndpoints
{
    private static readonly ConcurrentDictionary<string, (DateTime Expiry, DashboardSummaryDto Summary)> _cachedSummaries = new();

    public static void InvalidateDashboardCache(string? systemId = null)
    {
        if (string.IsNullOrWhiteSpace(systemId))
        {
            _cachedSummaries.Clear();
        }
        else
        {
            _cachedSummaries.TryRemove(systemId, out _);
        }
    }

    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/summary", async (
            HttpContext httpContext,
            IServicesRepository servicesRepo,
            IDockerService docker,
            IBackupRepository backupRepo,
            IMetricsRepository metricsRepo,
            ITelemetryRingBuffer ringBuffer,
            ISystemRepository systemRepo) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedSystemId))
            {
                requestedSystemId = httpContext.Request.Query["systemId"].FirstOrDefault();
            }
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            var now = DateTime.UtcNow;
            if (_cachedSummaries.TryGetValue(systemId, out var cached) && now < cached.Expiry)
            {
                return Results.Ok(cached.Summary);
            }

            DashboardSummaryDto summary;

            if (systemId == "local-host")
            {
                // Yerel Sunucu (Host) - Veritabanı ve yerel Docker sorgularını paralel çalıştır
                var servicesTask = servicesRepo.GetAllAsync();
                var containersTask = docker.GetContainersAsync();
                var backupTask = backupRepo.GetLatestAsync();
                var metricsTask = metricsRepo.GetLatestAsync();

                await Task.WhenAll(servicesTask, containersTask, backupTask, metricsTask);

                var services = await servicesTask;
                int totalServices = services.Count;
                int healthy = services.Count(s => s.Status == "healthy");
                int degraded = services.Count(s => s.Status == "degraded");
                int down = services.Count(s => s.Status == "down");

                var containers = await containersTask;
                int totalContainers = containers.Count;
                int runningContainers = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

                var lastBackup = await backupTask;
                var latestMetrics = await metricsTask;

                summary = new DashboardSummaryDto(
                    totalServices,
                    healthy,
                    degraded,
                    down,
                    totalContainers,
                    runningContainers,
                    lastBackup,
                    latestMetrics
                );

                _cachedSummaries[systemId] = (now.AddSeconds(15), summary);
            }
            else
            {
                // Uç Sistem (Edge Agent - örn. Deneme)
                ringBuffer.TryGetLatest(systemId, out var pt);

                SystemMetric? latestMetrics = null;
                if (pt.TimestampUnixSeconds > 0)
                {
                    latestMetrics = new SystemMetric
                    {
                        CpuPercent = Math.Round(pt.CpuPercent, 1),
                        RamUsedMb = (long)Math.Round(pt.RamUsedBytes / (1024.0 * 1024.0)),
                        RamTotalMb = (long)Math.Round(pt.RamTotalBytes / (1024.0 * 1024.0)),
                        DiskUsedGb = (long)Math.Round(pt.DiskUsedBytes / (1024.0 * 1024.0 * 1024.0)),
                        DiskTotalGb = (long)Math.Round(pt.DiskTotalBytes / (1024.0 * 1024.0 * 1024.0)),
                        NetworkRxBytes = pt.NetRxBytesSec,
                        NetworkTxBytes = pt.NetTxBytesSec,
                        RecordedAt = DateTimeOffset.FromUnixTimeSeconds(pt.TimestampUnixSeconds).UtcDateTime.ToString("o")
                    };
                }

                var containers = ringBuffer.GetCachedContainers(systemId);
                if (containers.Count == 0)
                {
                    containers = await systemRepo.GetCachedContainersAsync(systemId);
                }

                int totalContainers = containers.Count;
                int runningContainers = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

                summary = new DashboardSummaryDto(
                    TotalServices: 0,
                    HealthyServices: 0,
                    DegradedServices: 0,
                    DownServices: 0,
                    TotalContainers: totalContainers,
                    RunningContainers: runningContainers,
                    LastBackup: null,
                    LatestMetrics: latestMetrics
                );

                // Uç telemetri canlı aktığı için 5 saniyelik daha taze önbellek
                _cachedSummaries[systemId] = (now.AddSeconds(5), summary);
            }

            return Results.Ok(summary);
        });
    }
}
