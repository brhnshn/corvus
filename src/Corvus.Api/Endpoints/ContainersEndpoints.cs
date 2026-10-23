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
        MapPowerStateEndpoints(group);
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
