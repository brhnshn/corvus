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
            IActivityLogRepository repo) =>
        {
            var result = await repo.GetPagedAsync(
                page ?? 1, 
                limit ?? 50, 
                category, 
                search);

            return Results.Ok(result);
        });
    }
}
