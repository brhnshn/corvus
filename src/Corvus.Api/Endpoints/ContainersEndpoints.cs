using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

public static partial class ContainersEndpoints
{
    public static void MapContainersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/containers")
            .AddEndpointFilter<CorvusAuthFilter>();

        MapLifecycleEndpoints(group);
        MapMetricsAndLogsEndpoints(group);
        MapTerminalEndpoints(group);
        MapUpdateAndConfigEndpoints(group, app);
    }

    private static void MapLifecycleEndpoints(RouteGroupBuilder group)
    {
        group.MapGet("/", async (
            HttpContext httpContext,
            IDockerService docker,
            ITelemetryRingBuffer ringBuffer,
            ISystemRepository systemRepo) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedSystemId))
            {
                requestedSystemId = httpContext.Request.Query["systemId"].FirstOrDefault();
            }
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId == "local-host")
            {
                var containers = await docker.GetContainersAsync();
                return Results.Ok(containers);
            }
            else
            {
                var raw = ringBuffer.GetCachedContainers(systemId);
                if (raw.Count == 0)
                {
                    raw = await systemRepo.GetCachedContainersAsync(systemId);
                }

                var mapped = raw.Select(c =>
                {
                    string shortId = !string.IsNullOrEmpty(c.ContainerId) && c.ContainerId.Length > 12
                        ? c.ContainerId[..12]
                        : (c.ContainerId ?? "unknown");

                    string displayName = !string.IsNullOrWhiteSpace(c.Name)
                        ? (c.Name.StartsWith('/') ? c.Name : "/" + c.Name)
                        : "/" + shortId;

                    return new DockerContainerInfo
                    {
                        Id = c.ContainerId ?? Guid.NewGuid().ToString("N"),
                        Names = new List<string> { displayName },
                        Image = c.Image ?? "",
                        State = string.IsNullOrWhiteSpace(c.State) ? "unknown" : c.State.ToLowerInvariant(),
                        Status = c.Status ?? "",
                        Created = 0,
                        Ports = ParsePorts(c.PortsJson),
                        Labels = new Dictionary<string, string>(),
                        Tags = new List<string>()
                    };
                }).ToList();

                return Results.Json(mapped, CorvusJsonSerializerContext.Default.ListDockerContainerInfo);
            }
        });

        group.MapPut("/{id}/tags", async (
            string id,
            UpdateContainerTagsRequest request,
            IServicesRepository repo,
            IDockerService docker,
            IEventBroadcaster broadcaster,
            ILoggerFactory loggerFactory,
            HttpContext httpContext) =>
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Container ID boş olamaz."));
            }

            var tags = request.Tags ?? new List<string>();
            var cleanTags = tags
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Select(t => t.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            await repo.SaveContainerTagsAsync(id, cleanTags);
            docker.InvalidateContainersCache();

            var username = httpContext.User.Identity?.Name ?? httpContext.Items["Corvus_User"] as string ?? "system";
            var logger = loggerFactory.CreateLogger("ContainersEndpoints");
            logger.LogInformation("Audit: User '{Username}' updated tags for container '{ContainerId}' to [{Tags}]",
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(username),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(id),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(string.Join(", ", cleanTags)));

            var payloadJson = JsonSerializer.Serialize(new ContainerTagsUpdatedEventPayload(id, cleanTags), CorvusJsonSerializerContext.Default.ContainerTagsUpdatedEventPayload);
            broadcaster.Broadcast("container_tags_updated", payloadJson);

            return Results.Json(
                new GenericApiResponse(true, "Konteyner etiketleri başarıyla güncellendi."),
                CorvusJsonSerializerContext.Default.GenericApiResponse);
        }).RequireAdmin();

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

    private static List<DockerPortInfo> ParsePorts(string? portsJson)
    {
        if (string.IsNullOrWhiteSpace(portsJson) || portsJson == "[]")
        {
            return new List<DockerPortInfo>();
        }
        try
        {
            return JsonSerializer.Deserialize(portsJson, CorvusJsonSerializerContext.Default.ListDockerPortInfo) 
                   ?? new List<DockerPortInfo>();
        }
        catch
        {
            return new List<DockerPortInfo>();
        }
    }
}
