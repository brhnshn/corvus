using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class ComposeEndpoints
{
    public static void MapComposeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/compose")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/{projectName}/file", async (string projectName, IComposeFileService composeService, CancellationToken ct) =>
        {
            var result = await composeService.GetComposeFileAsync(projectName, ct);
            return Results.Json(result, CorvusJsonSerializerContext.Default.ComposeFileDto);
        });

        group.MapPut("/{projectName}/file", async (string projectName, SaveComposeFileRequest request, IComposeFileService composeService, CancellationToken ct) =>
        {
            var result = await composeService.SaveComposeFileAsync(projectName, request, ct);
            return result.Success
                ? Results.Ok(result)
                : Results.Json(result, CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 400);
        }).RequireAdmin();
    }
}
