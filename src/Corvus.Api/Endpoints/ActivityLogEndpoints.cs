using Corvus.Api.Data;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class ActivityLogEndpoints
{
    public static void MapActivityLogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/activity-logs")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/", async (
            int? page, 
            int? limit, 
            string? category, 
            string? search, 
            string? systemId,
            HttpContext httpContext,
            IActivityLogRepository repo) =>
        {
            var effectiveSystemId = systemId;
            if (string.IsNullOrWhiteSpace(effectiveSystemId) && httpContext.Request.Headers.TryGetValue("X-System-Id", out var headerVal))
            {
                effectiveSystemId = headerVal.ToString();
            }

            var result = await repo.GetPagedAsync(
                page ?? 1, 
                limit ?? 50, 
                category, 
                search,
                effectiveSystemId);

            return Results.Ok(result);
        });
    }
}
