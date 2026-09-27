using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.Endpoints;

public static class StatusPageEndpoints
{
    public static void MapStatusPageEndpoints(this IEndpointRouteBuilder app)
    {
        // 1.6: Halka Açık / Şifresiz Durum Sayfası Uç Noktası (N+1 engellenmiş tekil SQL agregasyonu)
        app.MapGet("/api/status-page", GetStatusPageAsync);
    }

    public static async Task<IResult> GetStatusPageAsync(
        IServicesRepository repo, 
        IUptimeRepository uptimeRepo,
        IIncidentRepository incidentRepo)
    {
        var publicServices = await repo.GetPublicServicesAsync();
        var uptimePercentages = await uptimeRepo.Get24hUptimePercentagesAsync();
        var serviceIds = publicServices.Select(s => s.Id);
        var recentChecksDict = await uptimeRepo.GetRecentChecksForServicesAsync(serviceIds, 30);
        var activeIncidents = await incidentRepo.GetActiveAsync();

        var incidentDtos = activeIncidents.Select(i => new ServiceIncidentDto(
            Id: i.Id,
            Title: i.Title,
            Message: i.Message,
            Severity: i.Severity,
            IsPinned: i.IsPinned,
            Status: i.Status,
            CreatedAt: i.CreatedAt,
            ResolvedAt: i.ResolvedAt
        )).ToList();

        var serviceDtos = new List<PublicServiceDto>(publicServices.Count);

        int downCount = 0;
        int degradedCount = 0;

        foreach (var s in publicServices)
        {
            double uptimePct = uptimePercentages.TryGetValue(s.Id, out double pct) ? pct : 100.0;
            var recentChecks = recentChecksDict.TryGetValue(s.Id, out var checks) ? checks : [];

            if (s.Status == "down") downCount++;
            else if (s.Status == "degraded") degradedCount++;

            serviceDtos.Add(new PublicServiceDto(
                Id: s.Id,
                Name: s.Name,
                Description: s.Description,
                Url: s.Url,
                Icon: s.Icon,
                Category: s.Category,
                Status: s.Status,
                SslExpiryDays: s.SslExpiryDays,
                UptimePercentage: uptimePct,
                RecentChecks: recentChecks
            ));
        }

        string overallStatus = "all_operational";
        if (publicServices.Count == 0)
        {
            overallStatus = "no_services";
        }
        else if (downCount > 0)
        {
            overallStatus = "major_outage";
        }
        else if (degradedCount > 0)
        {
            overallStatus = "some_degraded";
        }

        var result = new PublicStatusPageDto(
            SystemStatus: overallStatus,
            Services: serviceDtos,
            GeneratedAt: DateTime.UtcNow.ToString("o"),
            Enabled: true,
            Message: publicServices.Count == 0 ? "Uptime takibi aktif edilmiş veya halka açık herhangi bir servis bulunmuyor." : null,
            Incidents: incidentDtos
        );

        return Results.Ok(result);
    }
}
