using System.Text.Json;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static partial class ContainersEndpoints
{
    private static void MapUpdateAndConfigEndpoints(RouteGroupBuilder group, IEndpointRouteBuilder app)
    {
        group.MapGet("/{id}/inspect", async (string id, HttpContext context, IDockerService docker, CancellationToken ct) =>
        {
            var inspect = await docker.InspectContainerAsync(id, ct);
            if (inspect == null)
            {
                return Results.Json(new GenericApiResponse(false, "Container inspect verisi alınamadı."), CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 404);
            }

            string? role = context.Items["Corvus_Role"] as string;
            if (string.Equals(role, "viewer", StringComparison.OrdinalIgnoreCase) && inspect.Config?.Env != null)
            {
                inspect.Config.Env = inspect.Config.Env.Select(env =>
                {
                    int eqIndex = env.IndexOf('=');
                    return eqIndex > 0 ? $"{env[..(eqIndex + 1)]}******" : "******";
                }).ToList();
            }

            return Results.Json(inspect, CorvusJsonSerializerContext.Default.DockerContainerInspectInfo);
        });

        group.MapPost("/{id}/update", async (string id, DockerContainerUpdateRequest request, IDockerService docker, CancellationToken ct) =>
        {
            var result = await docker.UpdateContainerAsync(id, request, ct);
            return result.Success
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container yapılandırması başarıyla güncellendi."))
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container yapılandırması güncellenemedi."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPatch("/{id}/resources", HandleUpdateResourcesAsync).RequireAdmin();
        group.MapPost("/{id}/resources", HandleUpdateResourcesAsync).RequireAdmin();
        group.MapPost("/{id}/update-config", HandleUpdateResourcesAsync).RequireAdmin();

        group.MapGet("/{id}/check-update", async (string id, IDockerService docker, CancellationToken ct) =>
        {
            var updateInfo = await docker.CheckContainerUpdateAsync(id, ct);
            return Results.Json(updateInfo, CorvusJsonSerializerContext.Default.ContainerImageUpdateInfo);
        });

        group.MapGet("/updates", async (IDockerService docker, CancellationToken ct) =>
        {
            var updates = await docker.CheckAllContainersUpdateAsync(ct);
            return Results.Json(updates, CorvusJsonSerializerContext.Default.ListContainerImageUpdateInfo);
        });

        group.MapPost("/{id}/recreate", async (string id, ContainerImageRecreateRequest? request, IDockerService docker, CancellationToken ct) =>
        {
            bool pullLatest = request?.PullLatest ?? true;
            var result = await docker.RecreateContainerAsync(id, pullLatest, ct);
            return result.Success
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container yeniden oluşturuldu."))
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container yeniden oluşturulamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        app.MapPost("/api/v1/containers/{id}/recreate", async (string id, ContainerImageRecreateRequest? request, IDockerService docker, CancellationToken ct) =>
        {
            bool pullLatest = request?.PullLatest ?? true;
            var result = await docker.RecreateContainerAsync(id, pullLatest, ct);
            return result.Success
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container yeniden oluşturuldu."))
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container yeniden oluşturulamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).AddEndpointFilter<CorvusAuthFilter>()
          .RequireAdmin();
    }

    private static async Task<IResult> HandleUpdateResourcesAsync(
        string id,
        ContainerResourceUpdateRequest request,
        IDockerService docker,
        IEventBroadcaster broadcaster,
        IActivityLogService? activityLogger,
        ILoggerFactory loggerFactory,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return Results.BadRequest(new GenericApiResponse(false, "Container ID boş olamaz."));
        }

        var result = await docker.UpdateContainerConfigAsync(id, request, ct);
        if (!result.Success)
        {
            return Results.Json(
                new GenericApiResponse(false, result.Message ?? "Container kaynak limitleri güncellenemedi."),
                CorvusJsonSerializerContext.Default.GenericApiResponse,
                statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }

        docker.InvalidateContainersCache();

        var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
        var ip = httpContext.Connection.RemoteIpAddress?.ToString();
        var logger = loggerFactory.CreateLogger("ContainersEndpoints");
        var detailsJson = JsonSerializer.Serialize(request, CorvusJsonSerializerContext.Default.ContainerResourceUpdateRequest);

        logger.LogInformation("Audit: User '{Username}' updated resources for container '{ContainerId}': {Details}",
            Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(username),
            Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(id),
            Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(detailsJson));

        activityLogger?.Log(username, "container.update_resources", "container", id, detailsJson, ip);

        var eventPayload = new ContainerResourcesUpdatedEventPayload(
            id,
            request.CpuCores,
            request.MemoryMb,
            request.RestartPolicy,
            request.MaximumRetryCount
        );
        var payloadJson = JsonSerializer.Serialize(eventPayload, CorvusJsonSerializerContext.Default.ContainerResourcesUpdatedEventPayload);
        broadcaster.Broadcast("container_resources_updated", payloadJson);

        return Results.Ok(new GenericApiResponse(true, result.Message ?? "Container kaynak limitleri başarıyla güncellendi."));
    }
}
