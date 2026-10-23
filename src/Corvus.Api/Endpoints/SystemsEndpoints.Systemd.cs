using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

// Yerel ve uzak systemd unit yönetimi ile journalctl log uç noktaları
public static partial class SystemsEndpoints
{
    private static void MapSystemdEndpoints(RouteGroupBuilder group)
    {
        // 13. Systemd Servis ve Süreç (Process) Yönetimi (Modül 2.3)
        group.MapGet("/systemd", async (ISystemdServiceClient systemdClient, CancellationToken ct) =>
        {
            var units = await systemdClient.ListUnitsAsync(ct);
            return Results.Json(units, CorvusJsonSerializerContext.Default.ListSystemdUnitDto);
        });

        group.MapGet("/{id}/systemd", async (
            string id,
            ISystemdServiceClient systemdClient,
            ISystemTunnelManager tunnelManager,
            CancellationToken ct) =>
        {
            if (string.Equals(id, "local", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(id))
            {
                var units = await systemdClient.ListUnitsAsync(ct);
                return Results.Json(units, CorvusJsonSerializerContext.Default.ListSystemdUnitDto);
            }

            if (!tunnelManager.IsConnected(id))
            {
                return Results.Json(new List<SystemdUnitDto>(), CorvusJsonSerializerContext.Default.ListSystemdUnitDto);
            }

            var rpcRes = await tunnelManager.SendDockerRequestAsync(id, new DockerRpcRequest(Action: "systemd.list"), TimeSpan.FromSeconds(10));
            if (!rpcRes.Success || string.IsNullOrWhiteSpace(rpcRes.Message))
            {
                return Results.Json(new List<SystemdUnitDto>(), CorvusJsonSerializerContext.Default.ListSystemdUnitDto);
            }

            try
            {
                var units = JsonSerializer.Deserialize(rpcRes.Message, CorvusJsonSerializerContext.Default.ListSystemdUnitDto) ?? [];
                return Results.Json(units, CorvusJsonSerializerContext.Default.ListSystemdUnitDto);
            }
            catch
            {
                return Results.Json(new List<SystemdUnitDto>(), CorvusJsonSerializerContext.Default.ListSystemdUnitDto);
            }
        });

        group.MapPost("/systemd/{unitName}/action", async (
            string unitName,
            SystemdActionRequest request,
            ISystemdServiceClient systemdClient,
            CancellationToken ct) =>
        {
            var result = await systemdClient.ControlUnitAsync(unitName, request.Action, ct);
            return result.Success
                ? Results.Ok(result)
                : Results.Json(result, CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 400);
        }).RequireAdmin();

        group.MapPost("/{id}/systemd/{unitName}/action", async (
            string id,
            string unitName,
            SystemdActionRequest request,
            ISystemdServiceClient systemdClient,
            ISystemTunnelManager tunnelManager,
            CancellationToken ct) =>
        {
            if (string.Equals(id, "local", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(id))
            {
                var localResult = await systemdClient.ControlUnitAsync(unitName, request.Action, ct);
                return localResult.Success
                    ? Results.Ok(localResult)
                    : Results.Json(localResult, CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 400);
            }

            if (!tunnelManager.IsConnected(id))
            {
                return Results.Json(new GenericApiResponse(false, "Sistem çevrimdışı veya tünel bağlantısı kapalı."), CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 503);
            }

            var rpcReq = new DockerRpcRequest(
                Action: "systemd.action",
                ContainerId: request.Action,
                ProjectName: unitName
            );

            var rpcRes = await tunnelManager.SendDockerRequestAsync(id, rpcReq, TimeSpan.FromSeconds(15));
            return rpcRes.Success
                ? Results.Ok(new GenericApiResponse(true, rpcRes.Message ?? "Eylem tamamlandı."))
                : Results.Json(new GenericApiResponse(false, rpcRes.Message ?? "Eylem başarısız."), CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 400);
        }).RequireAdmin();

        group.MapGet("/systemd/{unitName}/logs", async (
            string unitName,
            int? lines,
            ISystemdServiceClient systemdClient,
            CancellationToken ct) =>
        {
            var logs = await systemdClient.GetUnitLogsAsync(unitName, lines ?? 100, ct);
            return Results.Json(logs, CorvusJsonSerializerContext.Default.SystemdLogsDto);
        }).RequireAdmin();

        group.MapGet("/{id}/systemd/{unitName}/logs", async (
            string id,
            string unitName,
            int? lines,
            ISystemdServiceClient systemdClient,
            ISystemTunnelManager tunnelManager,
            CancellationToken ct) =>
        {
            if (string.Equals(id, "local", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(id))
            {
                var localLogs = await systemdClient.GetUnitLogsAsync(unitName, lines ?? 100, ct);
                return Results.Json(localLogs, CorvusJsonSerializerContext.Default.SystemdLogsDto);
            }

            if (!tunnelManager.IsConnected(id))
            {
                return Results.Json(new SystemdLogsDto { Unit = unitName, Logs = ["Sistem çevrimdışı veya tünel bağlantısı kapalı."] }, CorvusJsonSerializerContext.Default.SystemdLogsDto);
            }

            var rpcReq = new DockerRpcRequest(
                Action: "systemd.logs",
                ProjectName: unitName,
                TailLines: lines ?? 100
            );

            var rpcRes = await tunnelManager.SendDockerRequestAsync(id, rpcReq, TimeSpan.FromSeconds(15));
            var logLines = rpcRes.Logs ?? (rpcRes.Message != null ? [rpcRes.Message] : []);
            return Results.Json(new SystemdLogsDto { Unit = unitName, Logs = logLines }, CorvusJsonSerializerContext.Default.SystemdLogsDto);
        }).RequireAdmin();
    }
}
