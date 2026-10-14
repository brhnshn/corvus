using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

public static class SystemsEndpoints
{
    public static void MapSystemsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/systems")
            .AddEndpointFilter<CorvusAuthFilter>();

        // 1. Status & Engine
        group.MapGet("/status", async (ISystemStatusService statusService) =>
        {
            var status = await statusService.GetStatusAsync();
            return Results.Json(status, CorvusJsonSerializerContext.Default.SystemStatusDto);
        });

        // 2. List Systems (with in-memory live telemetry snapshot)
        group.MapGet("/", async (
            ISystemRepository repo,
            ITelemetryRingBuffer ringBuffer,
            ISystemTunnelManager tunnelManager) =>
        {
            var systems = await repo.GetAllAsync();
            var summaries = new List<SystemSummaryDto>(systems.Count);

            foreach (var sys in systems)
            {
                var tags = new List<string>();
                try
                {
                    if (!string.IsNullOrWhiteSpace(sys.TagsJson))
                    {
                        tags = JsonSerializer.Deserialize(sys.TagsJson, CorvusJsonSerializerContext.Default.ListString) ?? new();
                    }
                }
                catch { }

                float? currentCpu = null;
                long? currentRamUsed = null;
                long? currentRamTotal = null;
                long? currentDiskUsed = null;
                long? currentDiskTotal = null;
                float? load1 = null;
                float? load5 = null;
                float? load15 = null;
                long? netRx = null;
                long? netTx = null;

                if (ringBuffer.TryGetLatest(sys.Id, out var pt))
                {
                    currentCpu = (float)Math.Round(pt.CpuPercent, 1);
                    currentRamUsed = pt.RamUsedBytes;
                    currentRamTotal = pt.RamTotalBytes;
                    currentDiskUsed = pt.DiskUsedBytes;
                    currentDiskTotal = pt.DiskTotalBytes;
                    load1 = pt.LoadAvg1m;
                    load5 = pt.LoadAvg5m;
                    load15 = pt.LoadAvg15m;
                    netRx = pt.NetRxBytesSec;
                    netTx = pt.NetTxBytesSec;
                }

                var containers = ringBuffer.GetCachedContainers(sys.Id);
                int activeContainers = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

                summaries.Add(new SystemSummaryDto(
                    Id: sys.Id,
                    Name: sys.Name,
                    Hostname: sys.Hostname,
                    IpAddress: sys.IpAddress,
                    OsInfo: sys.OsInfo,
                    AgentVersion: sys.AgentVersion,
                    Tags: tags,
                    Status: sys.Status,
                    CreatedAt: sys.CreatedAt,
                    LastSeenAt: sys.LastSeenAt,
                    CurrentCpuPercent: currentCpu,
                    CurrentRamUsedBytes: currentRamUsed,
                    CurrentRamTotalBytes: currentRamTotal,
                    CurrentDiskUsedBytes: currentDiskUsed,
                    CurrentDiskTotalBytes: currentDiskTotal,
                    ActiveContainerCount: activeContainers,
                    LastPingMs: null,
                    LoadAvg1m: load1,
                    LoadAvg5m: load5,
                    LoadAvg15m: load15,
                    NetRxBytesSec: netRx,
                    NetTxBytesSec: netTx
                ));
            }

            return Results.Json(summaries, CorvusJsonSerializerContext.Default.ListSystemSummaryDto);
        });

        // 3. Create System & Generate Node Key
        group.MapPost("/", async (
            CreateSystemRequest request,
            ISystemRepository repo,
            ISystemAuthService authService,
            HttpContext httpContext) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Sistem adı zorunludur."));
            }

            string systemId = Guid.NewGuid().ToString("N");
            string now = DateTime.UtcNow.ToString("o");
            var tags = request.Tags ?? new List<string>();
            string tagsJson = JsonSerializer.Serialize(tags, CorvusJsonSerializerContext.Default.ListString);

            var system = new SystemEntity
            {
                Id = systemId,
                Name = request.Name.Trim(),
                TagsJson = tagsJson,
                Status = "pending",
                CreatedAt = now,
                UpdatedAt = now
            };

            await repo.CreateAsync(system);
            string nodeKey = await authService.CreateSystemTokenAsync(systemId);

            string hubUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";

            var response = new CreateSystemResponse(
                System: system,
                NodeKey: nodeKey,
                HubUrl: hubUrl
            );

            return Results.Json(response, CorvusJsonSerializerContext.Default.CreateSystemResponse);
        }).RequireAdmin();

        // 4. Get System Details
        group.MapGet("/{id}", async (
            string id,
            ISystemRepository repo,
            ITelemetryRingBuffer ringBuffer) =>
        {
            var system = await repo.GetByIdAsync(id);
            if (system == null) return Results.NotFound();

            var tags = new List<string>();
            try
            {
                if (!string.IsNullOrWhiteSpace(system.TagsJson))
                {
                    tags = JsonSerializer.Deserialize(system.TagsJson, CorvusJsonSerializerContext.Default.ListString) ?? new();
                }
            }
            catch { }

            ringBuffer.TryGetLatest(id, out var latest);
            var containers = ringBuffer.GetCachedContainers(id);
            if (containers.Count == 0)
            {
                containers = await repo.GetCachedContainersAsync(id);
            }

            int running = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

            var detail = new SystemDetailDto(
                System: system,
                Tags: tags,
                LatestPoint: latest.TimestampUnixSeconds > 0 ? latest : null,
                Containers: containers.ToList(),
                TotalContainers: containers.Count,
                RunningContainers: running
            );

            return Results.Json(detail, CorvusJsonSerializerContext.Default.SystemDetailDto);
        });

        // 4b. Update System (Name, Tags, Status / Paused)
        group.MapPut("/{id}", async (
            string id,
            UpdateSystemRequest request,
            ISystemRepository repo) =>
        {
            var system = await repo.GetByIdAsync(id);
            if (system == null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                system.Name = request.Name.Trim();
            }

            if (request.Tags != null)
            {
                system.TagsJson = JsonSerializer.Serialize(request.Tags, CorvusJsonSerializerContext.Default.ListString);
            }

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                system.Status = request.Status.Trim();
            }

            system.UpdatedAt = DateTime.UtcNow.ToString("o");
            await repo.UpdateAsync(system);

            return Results.Json(new GenericApiResponse(true, "Sistem güncellendi."),
                CorvusJsonSerializerContext.Default.GenericApiResponse);
        }).RequireAdmin();

        // 5. Delete System
        group.MapDelete("/{id}", async (
            string id,
            ISystemRepository repo,
            ITelemetryRingBuffer ringBuffer,
            ISystemTunnelManager tunnelManager) =>
        {
            if (id == "local-host")
            {
                return Results.BadRequest(new GenericApiResponse(false, "Yerel sunucu (Host Node) silinemez."));
            }

            var socket = tunnelManager.GetActiveSocket(id);
            if (socket != null && socket.State == WebSocketState.Open)
            {
                try { await socket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "System removed", CancellationToken.None); } catch { }
            }

            ringBuffer.RemoveSystem(id);
            int deleted = await repo.DeleteAsync(id);

            return Results.Json(new GenericApiResponse(deleted > 0, deleted > 0 ? "Sistem silindi." : "Sistem bulunamadı."),
                CorvusJsonSerializerContext.Default.GenericApiResponse);
        }).RequireAdmin();

        // 6. Revoke Token
        group.MapPost("/{id}/token/revoke", async (
            string id,
            ISystemAuthService authService,
            ISystemTunnelManager tunnelManager) =>
        {
            if (id == "local-host")
            {
                return Results.BadRequest(new GenericApiResponse(false, "Yerel sunucu için anahtar iptal edilemez."));
            }

            await authService.RevokeTokenAsync(id);
            var socket = tunnelManager.GetActiveSocket(id);
            if (socket != null && socket.State == WebSocketState.Open)
            {
                try { await socket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Token revoked", CancellationToken.None); } catch { }
            }

            return Results.Json(new GenericApiResponse(true, "Erişim anahtarı iptal edildi."),
                CorvusJsonSerializerContext.Default.GenericApiResponse);
        }).RequireAdmin();

        // 7. Telemetry Metrics History (live RAM or downsampled DB)
        group.MapGet("/{id}/metrics", async (
            string id,
            string? range,
            ITelemetryRingBuffer ringBuffer,
            ISystemMetricRepository metricRepo) =>
        {
            string r = (range ?? "live").ToLowerInvariant();

            if (r == "live")
            {
                var points = ringBuffer.GetRecentPoints(id, 60);
                var list = new List<SystemDownsampledPoint>(points.Count);
                for (int i = 0; i < points.Count; i++)
                {
                    var pt = points[i];
                    list.Add(new SystemDownsampledPoint(
                        Timestamp: DateTimeOffset.FromUnixTimeSeconds(pt.TimestampUnixSeconds).UtcDateTime.ToString("o"),
                        CpuPercent: Math.Round(pt.CpuPercent, 1),
                        RamUsedBytes: pt.RamUsedBytes,
                        DiskUsedBytes: pt.DiskUsedBytes,
                        RxBytesPerSec: pt.NetRxBytesSec,
                        TxBytesPerSec: pt.NetTxBytesSec
                    ));
                }
                return Results.Json(list, CorvusJsonSerializerContext.Default.ListSystemDownsampledPoint);
            }
            else if (r is "1h" or "24h" or "7d")
            {
                int hours = r switch
                {
                    "1h" => 1,
                    "24h" => 24,
                    _ => 168 // 7d
                };

                string since = DateTime.UtcNow.AddHours(-hours).ToString("o");
                var history1m = await metricRepo.Get1mHistoryAsync(id, since, limit: 1440);

                var list = new List<SystemDownsampledPoint>(history1m.Count);
                foreach (var h in history1m)
                {
                    list.Add(new SystemDownsampledPoint(
                        Timestamp: h.RecordedAt,
                        CpuPercent: h.CpuPercent,
                        RamUsedBytes: h.RamUsedBytes,
                        DiskUsedBytes: h.DiskUsedBytes,
                        RxBytesPerSec: h.NetworkRxBytesSec,
                        TxBytesPerSec: h.NetworkTxBytesSec
                    ));
                }
                return Results.Json(list, CorvusJsonSerializerContext.Default.ListSystemDownsampledPoint);
            }
            else // 30d
            {
                string since = DateTime.UtcNow.AddDays(-30).ToString("o");
                var history1h = await metricRepo.Get1hHistoryAsync(id, since, limit: 720);

                var list = new List<SystemDownsampledPoint>(history1h.Count);
                foreach (var h in history1h)
                {
                    list.Add(new SystemDownsampledPoint(
                        Timestamp: h.RecordedAt,
                        CpuPercent: h.CpuAvg,
                        RamUsedBytes: h.RamUsedAvg,
                        DiskUsedBytes: h.DiskUsedAvg,
                        RxBytesPerSec: h.NetworkRxTotal,
                        TxBytesPerSec: h.NetworkTxTotal
                    ));
                }
                return Results.Json(list, CorvusJsonSerializerContext.Default.ListSystemDownsampledPoint);
            }
        });

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

        // 9. Docker Container Actions: start | stop | restart
        group.MapPost("/{id}/containers/{cid}/{action}", async (
            string id,
            string cid,
            string action,
            ISystemTunnelManager tunnelManager,
            IDockerService dockerService) =>
        {
            if (action is not ("start" or "stop" or "restart"))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Geçersiz konteyner eylemi."));
            }

            if (id == "local-host")
            {
                var actionRes = action switch
                {
                    "start" => await dockerService.StartContainerAsync(cid),
                    "stop" => await dockerService.StopContainerAsync(cid),
                    "restart" => await dockerService.RestartContainerAsync(cid),
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

        // 11. Canlı Telemetri SSE Akışı (100ms Sync)
        group.MapGet("/{id}/stream", async (
            string id,
            HttpContext context,
            ITelemetryRingBuffer ringBuffer,
            CancellationToken ct) =>
        {
            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers["X-Accel-Buffering"] = "no";

            if (context.Request.Protocol.StartsWith("HTTP/1", StringComparison.OrdinalIgnoreCase))
            {
                context.Response.Headers.Connection = "keep-alive";
            }

            var writeLock = new SemaphoreSlim(1, 1);

            async Task SendDataAsync(string data, CancellationToken token)
            {
                await writeLock.WaitAsync(token);
                try
                {
                    await context.Response.WriteAsync(data, token);
                    await context.Response.Body.FlushAsync(token);
                }
                catch (IOException)
                {
                }
                finally
                {
                    writeLock.Release();
                }
            }

            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            var pingTask = Task.Run(async () =>
            {
                while (!linkedCts.Token.IsCancellationRequested)
                {
                    try
                    {
                        await Task.Delay(TimeSpan.FromSeconds(15), linkedCts.Token);
                        await SendDataAsync(": ping\n\n", linkedCts.Token);
                    }
                    catch
                    {
                        break;
                    }
                }
            }, linkedCts.Token);

            try
            {
                await foreach (var pt in ringBuffer.StreamAsync(id, linkedCts.Token))
                {
                    var containers = ringBuffer.GetCachedContainers(id);
                    int activeCount = containers.Count(c => c.State.Equals("running", StringComparison.OrdinalIgnoreCase));

                    var dto = new SystemTelemetryStreamDto(
                        SystemId: id,
                        TimestampUnixSeconds: pt.TimestampUnixSeconds,
                        CpuPercent: (float)Math.Round(pt.CpuPercent, 1),
                        CpuCores: pt.CpuCores,
                        RamUsedBytes: pt.RamUsedBytes,
                        RamTotalBytes: pt.RamTotalBytes,
                        DiskUsedBytes: pt.DiskUsedBytes,
                        DiskTotalBytes: pt.DiskTotalBytes,
                        NetRxBytesSec: pt.NetRxBytesSec,
                        NetTxBytesSec: pt.NetTxBytesSec,
                        LoadAvg1m: pt.LoadAvg1m,
                        LoadAvg5m: pt.LoadAvg5m,
                        LoadAvg15m: pt.LoadAvg15m,
                        ActiveContainers: activeCount
                    );

                    string json = JsonSerializer.Serialize(dto, CorvusJsonSerializerContext.Default.SystemTelemetryStreamDto);
                    await SendDataAsync($"event: telemetry\ndata: {json}\n\n", linkedCts.Token);
                }
            }
            catch (OperationCanceledException)
            {
            }
            finally
            {
                linkedCts.Cancel();
                try { await pingTask; } catch { }
            }
        });

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
        });

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
        });

        group.MapGet("/systemd/{unitName}/logs", async (
            string unitName,
            int? lines,
            ISystemdServiceClient systemdClient,
            CancellationToken ct) =>
        {
            var logs = await systemdClient.GetUnitLogsAsync(unitName, lines ?? 100, ct);
            return Results.Json(logs, CorvusJsonSerializerContext.Default.SystemdLogsDto);
        });

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
        });
    }
}
