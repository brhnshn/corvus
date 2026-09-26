using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.Endpoints;

public static class StatusPageEndpoints
{
    public static void MapStatusPageEndpoints(this IEndpointRouteBuilder app)
    {
        // 1.6: Halka Açık / Şifresiz Durum Sayfası Uç Noktası (N+1 engellenmiş tekil SQL agregasyonu)
        app.MapGet("/api/status-page", async (IServicesRepository repo, IUptimeRepository uptimeRepo, ISettingsRepository settingsRepo) =>
        {
            var enabledSetting = await settingsRepo.GetAsync("status_page_enabled");
            bool isEnabled = string.Equals(enabledSetting, "true", StringComparison.OrdinalIgnoreCase);

            if (!isEnabled)
            {
                return Results.Ok(new PublicStatusPageDto(
                    SystemStatus: "disabled",
                    Services: [],
                    GeneratedAt: DateTime.UtcNow.ToString("o"),
                    Enabled: false,
                    Message: "Durum sayfası şu anda devre dışıdır."
                ));
            }

            var publicServices = await repo.GetPublicServicesAsync();
            var uptimePercentages = await uptimeRepo.Get24hUptimePercentagesAsync();
            var serviceDtos = new List<PublicServiceDto>(publicServices.Count);

            int downCount = 0;
            int degradedCount = 0;

            foreach (var s in publicServices)
            {
                double uptimePct = uptimePercentages.TryGetValue(s.Id, out double pct) ? pct : 100.0;

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
                    RecentChecks: []
                ));
            }

            string overallStatus = "all_operational";
            if (downCount > 0) overallStatus = "major_outage";
            else if (degradedCount > 0) overallStatus = "some_degraded";

            var result = new PublicStatusPageDto(
                SystemStatus: overallStatus,
                Services: serviceDtos,
                GeneratedAt: DateTime.UtcNow.ToString("o"),
                Enabled: true,
                Message: null
            );

            return Results.Ok(result);
        });
    }
}
