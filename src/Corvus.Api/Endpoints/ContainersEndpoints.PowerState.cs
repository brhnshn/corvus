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

            var label = await ResolveContainerLabelAsync(docker, systemId, id);
            docker.ClearContainerManualStop(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "restart", ContainerId: id));
                if (rpcResp.Success)
                {
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_restart", "container", label, rpcResp.Message, systemId: systemId);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Konteyner yeniden başlatıldı."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Konteyner yeniden başlatılamadı."));
            }

            var result = await docker.RestartContainerAsync(id);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_restart", "container", label, result.Message, systemId: systemId);
            }
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Konteyner yeniden başlatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Konteyner yeniden başlatılamadı."), 
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

            var label = await ResolveContainerLabelAsync(docker, systemId, id);
            docker.ClearContainerManualStop(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "start", ContainerId: id));
                if (rpcResp.Success)
                {
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_start", "container", label, rpcResp.Message, systemId: systemId);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Konteyner başlatıldı."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Konteyner başlatılamadı."));
            }

            var result = await docker.StartContainerAsync(id);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_start", "container", label, result.Message, systemId: systemId);
            }
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Konteyner başlatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Konteyner başlatılamadı."), 
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

            var label = await ResolveContainerLabelAsync(docker, systemId, id);
            docker.MarkContainerManuallyStopped(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "stop", ContainerId: id));
                if (rpcResp.Success)
                {
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_stop", "container", label, rpcResp.Message, systemId: systemId);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Konteyner durduruldu."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Konteyner durdurulamadı."));
            }

            var result = await docker.StopContainerAsync(id);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_stop", "container", label, result.Message, systemId: systemId);
            }
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Konteyner durduruldu.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Konteyner durdurulamadı."), 
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
                return Results.BadRequest(new GenericApiResponse(false, "Konteyner ID boş olamaz."));
            }

            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            var label = await ResolveContainerLabelAsync(docker, systemId, id);
            docker.MarkContainerManuallyStopped(id);

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "delete", ContainerId: id));
                if (rpcResp.Success)
                {
                    docker.ClearContainerManualStop(id);
                    var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                    activityLogger?.Log(username, "container_delete", "container", label, rpcResp.Message, systemId: systemId);
                    var payloadJson = JsonSerializer.Serialize(new ContainerDeletedEventPayload(id), CorvusJsonSerializerContext.Default.ContainerDeletedEventPayload);
                    broadcaster?.Broadcast("container_deleted", payloadJson);
                    return Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Konteyner silindi."));
                }
                return Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Konteyner silinemedi."));
            }

            var result = await docker.DeleteContainerAsync(id, force ?? false, removeVolumes ?? false, ct);
            if (result.Success)
            {
                var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
                activityLogger?.Log(username, "container_delete", "container", label, result.Message, systemId: systemId);
                var payloadJson = JsonSerializer.Serialize(new ContainerDeletedEventPayload(id), CorvusJsonSerializerContext.Default.ContainerDeletedEventPayload);
                broadcaster?.Broadcast("container_deleted", payloadJson);
            }
            return result.Success
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Konteyner silindi."))
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Konteyner silinemedi."),
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
                    ? Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Konteyner duraklatıldı."))
                    : Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Konteyner duraklatılamadı."));
            }

            var result = await docker.PauseContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Konteyner duraklatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Konteyner duraklatılamadı."), 
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
                    ? Results.Ok(new GenericApiResponse(true, rpcResp.Message ?? "Konteyner devam ettirildi."))
                    : Results.BadRequest(new GenericApiResponse(false, rpcResp.Message ?? "Konteyner devam ettirilemedi."));
            }

            var result = await docker.UnpauseContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Konteyner devam ettirildi.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Konteyner devam ettirilemedi."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();
    }

    // Olay günlüğünde 64 karakterlik ID yerine okunabilir konteyner adı gösterilir.
    // Uzak düğümde ad bilinmediği için kısa ID'ye düşülür.
    public static async Task<string> ResolveContainerLabelAsync(IDockerService docker, string systemId, string id)
    {
        var shortId = id.Length > 12 ? id[..12] : id;
        if (systemId != "local-host") return shortId;

        try
        {
            var containers = await docker.GetContainersAsync();
            var match = containers.FirstOrDefault(c =>
                c.Id.Equals(id, StringComparison.OrdinalIgnoreCase) ||
                c.Id.StartsWith(id, StringComparison.OrdinalIgnoreCase));
            var name = match?.Names?.FirstOrDefault()?.TrimStart('/');
            return string.IsNullOrWhiteSpace(name) ? shortId : name;
        }
        catch
        {
            return shortId;
        }
    }
}
