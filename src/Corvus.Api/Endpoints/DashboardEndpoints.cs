using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class DashboardEndpoints
{
    private static (DateTime Expiry, DashboardSummaryDto? Summary) _cachedSummary;
    private static readonly object _summaryLock = new();

    public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/summary", async (
            IServicesRepository servicesRepo,
            IDockerService docker,
            IBackupRepository backupRepo,
            IMetricsRepository metricsRepo) =>
        {
            var now = DateTime.UtcNow;
            lock (_summaryLock)
            {
                if (_cachedSummary.Summary != null && now < _cachedSummary.Expiry)
                {
                    return Results.Ok(_cachedSummary.Summary);
                }
            }

            // Veritabanı ve Docker sorgularını paralel çalıştırarak gecikmeyi düşür
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

            var summary = new DashboardSummaryDto(
                totalServices,
                healthy,
                degraded,
                down,
                totalContainers,
                runningContainers,
                lastBackup,
                latestMetrics
            );

            lock (_summaryLock)
            {
                _cachedSummary = (DateTime.UtcNow.AddSeconds(15), summary);
            }

            return Results.Ok(summary);
        });
    }
}
