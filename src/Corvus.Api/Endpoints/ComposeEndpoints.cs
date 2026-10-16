using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class ComposeEndpoints
{
    public static void MapComposeEndpoints(this IEndpointRouteBuilder app)
    {
        MapGroup(app.MapGroup("/api/compose"));
        MapGroup(app.MapGroup("/api/v1/compose"));
    }

    private static void MapGroup(RouteGroupBuilder group)
    {
        group.AddEndpointFilter<CorvusAuthFilter>()
            .RequireAdmin();

        group.MapGet("/{projectName}/file", async (string projectName, IComposeFileService composeService, CancellationToken ct) =>
        {
            var result = await composeService.GetComposeFileAsync(projectName, ct);
            return Results.Json(result, CorvusJsonSerializerContext.Default.ComposeFileDto);
        }).RequireAdmin();

        group.MapGet("/{projectName}", async (string projectName, IComposeFileService composeService, CancellationToken ct) =>
        {
            var result = await composeService.GetComposeFileAsync(projectName, ct);
            return Results.Json(result, CorvusJsonSerializerContext.Default.ComposeFileDto);
        }).RequireAdmin();

        group.MapPut("/{projectName}/file", async (string projectName, SaveComposeFileRequest request, IComposeFileService composeService, CancellationToken ct) =>
        {
            var result = await composeService.SaveComposeFileAsync(projectName, request, ct);
            return result.Success
                ? Results.Ok(result)
                : Results.Json(result, CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 400);
        }).RequireAdmin();

        group.MapPut("/{projectName}", async (string projectName, SaveComposeFileRequest request, IComposeFileService composeService, CancellationToken ct) =>
        {
            var result = await composeService.SaveComposeFileAsync(projectName, request, ct);
            return result.Success
                ? Results.Ok(result)
                : Results.Json(result, CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 400);
        }).RequireAdmin();

        group.MapPost("/{projectName}/deploy", async (string projectName, IComposeFileService composeService, CancellationToken ct) =>
        {
            var result = await composeService.DeployComposeAsync(projectName, ct);
            return result.Success
                ? Results.Json(result, CorvusJsonSerializerContext.Default.ComposeDeployResult)
                : Results.Json(result, CorvusJsonSerializerContext.Default.ComposeDeployResult, statusCode: 400);
        }).RequireAdmin();
    }
}
