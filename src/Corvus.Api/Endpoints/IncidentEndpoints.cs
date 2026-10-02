using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class IncidentEndpoints
{
    public static void MapIncidentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/incidents")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/", async (IIncidentRepository repo) =>
        {
            var incidents = await repo.GetAllAsync();
            return Results.Ok(incidents);
        });

        group.MapPost("/", async (CreateIncidentRequest req, IIncidentRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Title and Message are required."));
            }

            var incident = await repo.CreateAsync(req);
            return Results.Created($"/api/incidents/{incident.Id}", incident);
        }).RequireAdmin();

        group.MapPut("/{id}", async (string id, UpdateIncidentRequest req, IIncidentRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Message))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Title and Message are required."));
            }

            var updated = await repo.UpdateAsync(id, req);
            if (updated == null)
            {
                return Results.NotFound(new GenericApiResponse(false, "Incident not found."));
            }

            return Results.Ok(updated);
        }).RequireAdmin();

        group.MapPost("/{id}/resolve", async (string id, IIncidentRepository repo) =>
        {
            bool success = await repo.ResolveAsync(id);
            if (!success)
            {
                return Results.NotFound(new GenericApiResponse(false, "Incident not found."));
            }

            return Results.Ok(new GenericApiResponse(true, "Incident marked as resolved."));
        }).RequireAdmin();

        group.MapDelete("/{id}", async (string id, IIncidentRepository repo) =>
        {
            bool success = await repo.DeleteAsync(id);
            if (!success)
            {
                return Results.NotFound(new GenericApiResponse(false, "Incident not found."));
            }

            return Results.Ok(new GenericApiResponse(true, "Incident deleted."));
        }).RequireAdmin();
    }
}
