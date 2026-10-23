using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

// Konteyner güç durumu eylemleri: yeniden başlat, başlat, durdur, sil, duraklat ve devam ettir (admin)
public static partial class ContainersEndpoints
{
    private static void MapPowerStateEndpoints(RouteGroupBuilder group)
    {
        group.MapPost("/{id}/restart", async (
            string id, 
            IDockerService docker, 
            ISystemTunnelManager tunnelManager,
            IActivityLogService? activityLogger, 
            HttpContext httpContext) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            docker.ClearContainerManualStop(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "restart", ContainerId: id));
                if (rpcResp.Success)
                {
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_restart", "container", id, rpcResp.Message);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Container yeniden başlatıldı."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Container yeniden başlatılamadı."));
            }

            var result = await docker.RestartContainerAsync(id);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_restart", "container", id, result.Message);
            }
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container yeniden başlatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container yeniden başlatılamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/start", async (
            string id, 
            IDockerService docker, 
            ISystemTunnelManager tunnelManager,
            IActivityLogService? activityLogger, 
            HttpContext httpContext) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            docker.ClearContainerManualStop(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "start", ContainerId: id));
                if (rpcResp.Success)
                {
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_start", "container", id, rpcResp.Message);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Container başlatıldı."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Container başlatılamadı."));
            }

            var result = await docker.StartContainerAsync(id);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_start", "container", id, result.Message);
            }
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container başlatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container başlatılamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/stop", async (
            string id, 
            IDockerService docker, 
            ISystemTunnelManager tunnelManager,
            IActivityLogService? activityLogger, 
            HttpContext httpContext) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            docker.MarkContainerManuallyStopped(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "stop", ContainerId: id));
                if (rpcResp.Success)
                {
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_stop", "container", id, rpcResp.Message);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Container durduruldu."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Container durdurulamadı."));
            }

            var result = await docker.StopContainerAsync(id);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_stop", "container", id, result.Message);
            }
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container durduruldu.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container durdurulamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapDelete("/{id}", async (
            string id,
            bool? force,
            bool? removeVolumes,
            IDockerService docker,
            ISystemTunnelManager tunnelManager,
            IActivityLogService? activityLogger,
            IEventBroadcaster? broadcaster,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Container ID boş olamaz."));
            }

            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            docker.MarkContainerManuallyStopped(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "delete", ContainerId: id));
                if (rpcResp.Success)
                {
                    docker.ClearContainerManualStop(id);
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_delete", "container", id, rpcResp.Message);
                    var payloadJson = JsonSerializer.Serialize(new ContainerDeletedEventPayload(id), CorvusJsonSerializerContext.Default.ContainerDeletedEventPayload);
                    broadcaster?.Broadcast("container_deleted", payloadJson);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Container silindi."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Container silinemedi."));
            }

            var result = await docker.DeleteContainerAsync(id, force ?? false, removeVolumes ?? false, ct);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_delete", "container", id, result.Message);
                var payloadJson = JsonSerializer.Serialize(new ContainerDeletedEventPayload(id), CorvusJsonSerializerContext.Default.ContainerDeletedEventPayload);
                broadcaster?.Broadcast("container_deleted", payloadJson);
            }
            return result.Success
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container silindi."))
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container silinemedi."),
                               CorvusJsonSerializerContext.Default.GenericApiResponse,
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/pause", async (
            string id, 
            IDockerService docker,
            ISystemTunnelManager tunnelManager,
            HttpContext httpContext) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "pause", ContainerId: id));
                return rpcResp.Success
                    ? Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Container duraklatıldı."))
                    : Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Container duraklatılamadı."));
            }

            var result = await docker.PauseContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container duraklatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container duraklatılamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/unpause", async (
            string id, 
            IDockerService docker,
            ISystemTunnelManager tunnelManager,
            HttpContext httpContext) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "unpause", ContainerId: id));
                return rpcResp.Success
                    ? Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Container devam ettirildi."))
                    : Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Container devam ettirilemedi."));
            }

            var result = await docker.UnpauseContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container devam ettirildi.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container devam ettirilemedi."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();
    }
}
