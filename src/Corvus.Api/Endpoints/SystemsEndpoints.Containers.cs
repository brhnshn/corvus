using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

// Tünel üzerinden uzak Docker konteyner listeleme, eylem ve log uç noktaları
public static partial class SystemsEndpoints
{
    private static void MapSystemContainerEndpoints(RouteGroupBuilder group)
    {
        // 8. Remote Containers List
        group.MapGet("/{id}/containers", async (
            string id,
            ISystemRepository repo,
            ITelemetryRingBuffer ringBuffer) =>
        {
            var containers = ringBuffer.GetCachedContainers(id);
            if (containers.Count == 0)
            {
                containers = await repo.GetCachedContainersAsync(id);
            }
            return Results.Json(containers, CorvusJsonSerializerContext.Default.ListSystemContainerCacheEntity);
        });

        // 9. Docker Container Actions: start | stop | restart | delete
        group.MapPost("/{id}/containers/{cid}/{action}", async (
            string id,
            string cid,
            string action,
            ISystemTunnelManager tunnelManager,
            IDockerService dockerService) =>
        {
            if (action is not ("start" or "stop" or "restart" or "delete"))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Geçersiz konteyner eylemi."));
            }

            if (action is "stop" or "delete")
            {
                dockerService.MarkContainerManuallyStopped(cid);
            }
            else if (action is "start" or "restart")
            {
                dockerService.ClearContainerManualStop(cid);
            }

            if (id == "local-host")
            {
                var actionRes = action switch
                {
                    "start" => await dockerService.StartContainerAsync(cid),
                    "stop" => await dockerService.StopContainerAsync(cid),
                    "restart" => await dockerService.RestartContainerAsync(cid),
                    "delete" => await dockerService.DeleteContainerAsync(cid, force: true, removeVolumes: false),
                    _ => new DockerActionResult(false, "Bilinmeyen eylem")
                };

                return Results.Json(new DockerRpcResponse(
                    Success: actionRes.Success,
                    Message: actionRes.Message
                ), CorvusJsonSerializerContext.Default.DockerRpcResponse);
            }

            var rpcReq = new DockerRpcRequest(Action: action, ContainerId: cid);
            var response = await tunnelManager.SendDockerRequestAsync(id, rpcReq, TimeSpan.FromSeconds(20));

            return Results.Json(response, CorvusJsonSerializerContext.Default.DockerRpcResponse);
        }).RequireAdmin();

        // 10. Docker Logs
        group.MapGet("/{id}/containers/{cid}/logs", async (
            string id,
            string cid,
            int? tail,
            ISystemTunnelManager tunnelManager,
            IDockerService dockerService) =>
        {
            if (id == "local-host")
            {
                var logLines = await dockerService.GetContainerLogsAsync(cid, tail ?? 100);
                return Results.Json(new DockerRpcResponse(
                    Success: true,
                    Message: null,
                    Logs: logLines
                ), CorvusJsonSerializerContext.Default.DockerRpcResponse);
            }

            var rpcReq = new DockerRpcRequest(Action: "logs", ContainerId: cid, TailLines: tail ?? 100);
            var response = await tunnelManager.SendDockerRequestAsync(id, rpcReq, TimeSpan.FromSeconds(15));

            return Results.Json(response, CorvusJsonSerializerContext.Default.DockerRpcResponse);
        });
    }
}
