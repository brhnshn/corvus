using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class ServicesEndpoints
{
    public static void MapServicesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/services")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/", async (IServicesRepository repo) =>
        {
            var services = await repo.GetAllAsync();
            return Results.Ok(services);
        });

        group.MapGet("/{id}", async (string id, IServicesRepository repo) =>
        {
            var service = await repo.GetByIdAsync(id);
            return service != null ? Results.Ok(service) : Results.NotFound();
        });

        group.MapPost("/", async (CreateServiceRequest request, IServicesRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Servis adı boş olamaz."));
            }

            if (request.IsPublic == true && request.IsUptimeEnabled == false)
            {
                return Results.BadRequest(new GenericApiResponse(false, "Uptime sağlık takibi aktif olmayan servisler durum sayfasına eklenemez."));
            }

            var created = await repo.CreateManualAsync(request);
            return Results.Created($"/api/services/{created.Id}", created);
        }).RequireAdmin();

        group.MapPut("/{id}", async (string id, UpdateServiceRequest request, IServicesRepository repo) =>
        {
            var existing = await repo.GetByIdAsync(id);
            if (existing == null) return Results.NotFound();

            bool targetPublic = request.IsPublic ?? existing.IsPublic;
            bool targetUptime = request.IsUptimeEnabled ?? existing.IsUptimeEnabled;

            if (targetPublic && !targetUptime)
            {
                return Results.BadRequest(new GenericApiResponse(false, "Uptime sağlık takibi aktif olmayan servisler durum sayfasına eklenemez."));
            }

            var updated = await repo.UpdateAsync(id, request);
            return updated != null ? Results.Ok(updated) : Results.NotFound();
        }).RequireAdmin();

        group.MapDelete("/{id}", async (string id, IServicesRepository repo) =>
        {
            bool success = await repo.DeleteAsync(id);
            return success ? Results.Ok(new GenericApiResponse(true, "Servis silindi veya override kaldırıldı.")) : Results.NotFound();
        }).RequireAdmin();

        group.MapPut("/reorder", async (ReorderServicesRequest request, IServicesRepository repo) =>
        {
            if (request.ServiceIds == null || request.ServiceIds.Count == 0)
            {
                return Results.BadRequest(new GenericApiResponse(false, "Sıralanacak servis listesi boş olamaz."));
            }

            await repo.ReorderAsync(request.ServiceIds);
            return Results.Ok(new GenericApiResponse(true, "Servis sıralaması güncellendi."));
        }).RequireAdmin();
    }
}
