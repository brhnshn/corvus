using System;
using System.Buffers;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.Endpoints;

public static class ContainersEndpoints
{
    public static void MapContainersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/containers")
            .AddEndpointFilter<CorvusAuthFilter>();

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

        group.MapPost("/prune", async (DockerPruneRequest request, IDockerService docker, CancellationToken ct) =>
        {
            var result = await docker.ExecuteSystemPruneAsync(request, ct);
            return Results.Json(result, CorvusJsonSerializerContext.Default.DockerPruneResult);
        }).RequireAdmin();

        group.MapGet("/system-df", async (IDockerService docker, CancellationToken ct) =>
        {
            var df = await docker.GetSystemDiskUsageAsync(ct);
            return df != null 
                ? Results.Json(df, CorvusJsonSerializerContext.Default.DockerSystemDfResponse)
                : Results.Json(new GenericApiResponse(false, "Docker disk kullanım analizi alınamadı."), CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 500);
        }).RequireAdmin();

        group.MapPost("/prune/selective", async (DockerSelectivePruneRequest request, IDockerService docker, CancellationToken ct) =>
        {
            var result = await docker.ExecuteSelectivePruneAsync(request, ct);
            return Results.Json(result, CorvusJsonSerializerContext.Default.DockerSelectivePruneResult);
        }).RequireAdmin();

        group.MapGet("/stats-summary", async (
            HttpContext httpContext,
            IDockerService docker,
            ITelemetryRingBuffer ringBuffer,
            ISystemRepository systemRepo,
            CancellationToken ct) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestedSystemId))
            {
                requestedSystemId = httpContext.Request.Query["systemId"].FirstOrDefault();
            }
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId != "local-host")
            {
                var edgeContainers = ringBuffer.GetCachedContainers(systemId);
                if (edgeContainers.Count == 0)
                {
                    edgeContainers = await systemRepo.GetCachedContainersAsync(systemId);
                }

                var statsDict = new Dictionary<string, ContainerStatsDto>();
                foreach (var c in edgeContainers)
                {
                    if (string.IsNullOrWhiteSpace(c.ContainerId)) continue;
                    statsDict[c.ContainerId] = new ContainerStatsDto(
                        ContainerId: c.ContainerId,
                        CpuPercent: c.CpuPercent,
                        MemoryUsageBytes: c.MemoryBytes,
                        MemoryLimitBytes: 0,
                        MemoryPercent: 0,
                        NetworkRxBytes: 0,
                        NetworkTxBytes: 0
                    );
                }
                return Results.Json(statsDict, CorvusJsonSerializerContext.Default.DictionaryStringContainerStatsDto);
            }

            var summary = await docker.GetActiveContainersStatsSummaryAsync(ct);
            return Results.Ok(summary);
        });

        group.MapGet("/{id}/stats", async (
            string id, 
            IDockerService docker, 
            ITelemetryRingBuffer ringBuffer,
            ISystemRepository systemRepo,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            if (systemId != "local-host")
            {
                var edgeContainers = ringBuffer.GetCachedContainers(systemId);
                if (edgeContainers.Count == 0)
                {
                    edgeContainers = await systemRepo.GetCachedContainersAsync(systemId);
                }
                var match = edgeContainers.FirstOrDefault(c => c.ContainerId.Equals(id, StringComparison.OrdinalIgnoreCase) 
                    || (!string.IsNullOrEmpty(c.ContainerId) && c.ContainerId.StartsWith(id, StringComparison.OrdinalIgnoreCase)));
                if (match != null)
                {
                    var dto = new ContainerStatsDto(
                        ContainerId: match.ContainerId,
                        CpuPercent: match.CpuPercent,
                        MemoryUsageBytes: match.MemoryBytes,
                        MemoryLimitBytes: 0,
                        MemoryPercent: 0,
                        NetworkRxBytes: 0,
                        NetworkTxBytes: 0
                    );
                    return Results.Json(dto, CorvusJsonSerializerContext.Default.ContainerStatsDto);
                }
                return Results.NotFound(new GenericApiResponse(false, "Stats alınamadı veya container çalışmıyor."));
            }

            var stats = await docker.GetContainerStatsAsync(id, ct);
            return stats != null 
                ? Results.Ok(stats) 
                : Results.NotFound(new GenericApiResponse(false, "Stats alınamadı veya container çalışmıyor."));
        });

        group.MapGet("/{id}/logs", async (
            string id, 
            int? tail, 
            IDockerService docker, 
            ISystemTunnelManager tunnelManager,
            HttpContext httpContext,
            CancellationToken ct) =>
        {
            string? requestedSystemId = httpContext.Request.Headers["X-System-Id"].FirstOrDefault()
                ?? httpContext.Request.Query["systemId"].FirstOrDefault();
            string systemId = string.IsNullOrWhiteSpace(requestedSystemId) ? "local-host" : requestedSystemId.Trim();

            int limit = tail.GetValueOrDefault(100);
            if (limit <= 0) limit = 100;
            if (limit > 1000) limit = 1000;

            if (systemId != "local-host")
            {
                var rpcResp = await tunnelManager.SendDockerRequestAsync(systemId, new DockerRpcRequest(Action: "logs", ContainerId: id, TailLines: limit));
                if (rpcResp.Success && rpcResp.Logs != null)
                {
                    return Results.Json(new ContainerLogsDto(id, rpcResp.Logs), CorvusJsonSerializerContext.Default.ContainerLogsDto);
                }
                return Results.Json(new ContainerLogsDto(id, new List<string> { rpcResp.Message ?? "Uç sunucudan loglar alınamadı." }), CorvusJsonSerializerContext.Default.ContainerLogsDto);
            }

            var lines = await docker.GetContainerLogsAsync(id, limit, ct);
            return Results.Json(new ContainerLogsDto(id, lines), CorvusJsonSerializerContext.Default.ContainerLogsDto);
        });

        group.MapGet("/{id}/logs/stream", async (string id, int? tail, HttpContext context, IDockerService docker, CancellationToken ct) =>
        {
            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers.Connection = "keep-alive";

            async Task WriteSseLineAsync(string rawLine)
            {
                var subLines = rawLine.Replace("\r\n", "\n").Replace('\r', '\n').Split('\n');
                foreach (var subLine in subLines)
                {
                    await context.Response.WriteAsync($"data: {subLine}\n", ct);
                }
                await context.Response.WriteAsync("\n", ct);
            }

            int limit = tail.GetValueOrDefault(50);
            var initialLines = await docker.GetContainerLogsAsync(id, limit, ct);
            var seenLines = new HashSet<string>(initialLines);

            foreach (var line in initialLines)
            {
                await WriteSseLineAsync(line);
            }
            await context.Response.Body.FlushAsync(ct);

            while (!ct.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(2000, ct);
                    var latest = await docker.GetContainerLogsAsync(id, 50, ct);
                    if (latest.Count > 0)
                    {
                        var newLines = new List<string>();
                        foreach (var line in latest)
                        {
                            if (seenLines.Add(line))
                            {
                                newLines.Add(line);
                            }
                        }

                        if (newLines.Count > 0)
                        {
                            foreach (var line in newLines)
                            {
                                await WriteSseLineAsync(line);
                            }
                            await context.Response.Body.FlushAsync(ct);
                        }

                        // Bellek şişmesini engelle: 1000'i geçerse en son satırları koru
                        if (seenLines.Count > 1000)
                        {
                            seenLines.Clear();
                            foreach (var line in latest)
                            {
                                seenLines.Add(line);
                            }
                        }
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        });

        group.MapGet("/{id}/terminal", async (
            string id, 
            HttpContext context, 
            IDockerService docker, 
            ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("ContainerTerminal");

            if (!context.WebSockets.IsWebSocketRequest)
            {
                return Results.BadRequest("WebSocket isteği bekleniyor.");
            }

            // WebSocket CSWSH (Cross-Site WebSocket Hijacking) Koruması
            if (context.Request.Headers.TryGetValue("Origin", out var originValues) && !string.IsNullOrWhiteSpace(originValues))
            {
                if (Uri.TryCreate(originValues.ToString(), UriKind.Absolute, out var originUri))
                {
                    if (!string.Equals(originUri.Authority, context.Request.Host.Value, StringComparison.OrdinalIgnoreCase))
                    {
                        logger.LogWarning("WebSocket CSWSH engellendi: Origin={Origin}, Host={Host}", 
                            Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(originValues.ToString()), 
                            Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(context.Request.Host.ToString()));
                        return Results.StatusCode(StatusCodes.Status403Forbidden);
                    }
                }
                else
                {
                    return Results.StatusCode(StatusCodes.Status403Forbidden);
                }
            }

            string rawShell = context.Request.Query["shell"].ToString().Trim();
            
            // Güvenli kabuk aday listesi ve akıllı fallback zinciri (/bin/sh -> sh -> /bin/bash -> /bin/ash)
            // POSIX /bin/sh istisnasız tüm Linux imajlarında (Alpine, Debian, Ubuntu, Distroless vb.) bulunur.
            var defaultShells = new[] { "/bin/sh", "sh", "/bin/bash", "/bin/ash" };
            var candidateShells = new List<string>();

            if (!string.IsNullOrWhiteSpace(rawShell) && !rawShell.Equals("auto", StringComparison.OrdinalIgnoreCase))
            {
                // Güvenlik: Kontrol karakterlerini ve aşırı uzun değerleri filtrele
                if (!rawShell.Any(char.IsControl) && rawShell.Length <= 64)
                {
                    candidateShells.Add(rawShell);
                }
            }

            foreach (var s in defaultShells)
            {
                if (!candidateShells.Contains(s, StringComparer.Ordinal))
                {
                    candidateShells.Add(s);
                }
            }

            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();

            string? activeExecId = null;
            Stream? dockerStream = null;
            string? activeShell = null;

            foreach (var candidate in candidateShells)
            {
                try
                {
                    string? execId = await docker.CreateExecInstanceAsync(id, candidate, context.RequestAborted);
                    if (string.IsNullOrWhiteSpace(execId))
                    {
                        continue;
                    }

                    var stream = await docker.StartExecStreamAsync(execId, context.RequestAborted);
                    activeExecId = execId;
                    dockerStream = stream;
                    activeShell = candidate;
                    logger.LogInformation("Konteyner terminali başlatıldı: Container={ContainerId}, Shell={Shell}",
                        Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(id),
                        Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(candidate));
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Kabuk başlatılamadı, fallback deneniyor: Container={ContainerId}, Shell={Shell}",
                        Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(id),
                        Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(candidate));
                }
            }

            if (dockerStream == null || string.IsNullOrWhiteSpace(activeExecId))
            {
                byte[] errBytes = Encoding.UTF8.GetBytes($"\r\n\x1b[31m[Hata] Konteyner içinde çalıştırılabilir bir kabuk ({string.Join(", ", candidateShells)}) bulunamadı.\x1b[0m\r\n");
                await webSocket.SendAsync(errBytes, WebSocketMessageType.Text, true, CancellationToken.None);
                await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Shell not found", CancellationToken.None);
                return Results.Empty;
            }

            if (!string.IsNullOrWhiteSpace(rawShell) && 
                !rawShell.Equals("auto", StringComparison.OrdinalIgnoreCase) && 
                !string.Equals(rawShell, activeShell, StringComparison.Ordinal))
            {
                byte[] fallbackNotice = Encoding.UTF8.GetBytes($"\r\n\x1b[33m[Corvus] '{rawShell}' kabuğu bulunamadı, '{activeShell}' kabuğuna bağlanıldı.\x1b[0m\r\n");
                await webSocket.SendAsync(fallbackNotice, WebSocketMessageType.Text, true, CancellationToken.None);
            }

            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
            using (dockerStream)
            {
                var ct = linkedCts.Token;

                // Docker <-> WebSocket doğrudan asenkron I/O pompaları (ThreadPool Task.Run sarmalayıcısı olmadan)
                var dockerToWsTask = PumpDockerToWsAsync(dockerStream, webSocket, linkedCts, ct);
                var wsToDockerTask = PumpWsToDockerAsync(dockerStream, webSocket, activeExecId, docker, linkedCts, ct);

                await Task.WhenAny(dockerToWsTask, wsToDockerTask);

                try
                {
                    if (webSocket.State == WebSocketState.Open || webSocket.State == WebSocketState.CloseReceived)
                    {
                        await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Session ended", CancellationToken.None);
                    }
                }
                catch { }

                return Results.Empty;
            }
        }).RequireAdmin();

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

    private static async Task PumpDockerToWsAsync(
        Stream dockerStream,
        WebSocket webSocket,
        CancellationTokenSource linkedCts,
        CancellationToken ct)
    {
        byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
        try
        {
            while (!ct.IsCancellationRequested && webSocket.State == WebSocketState.Open)
            {
                int bytesRead = await dockerStream.ReadAsync(buffer, 0, buffer.Length, ct);
                if (bytesRead == 0) break;

                await webSocket.SendAsync(
                    new ArraySegment<byte>(buffer, 0, bytesRead),
                    WebSocketMessageType.Binary,
                    endOfMessage: true,
                    ct);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex) when (ex is IOException or SocketException or WebSocketException) { }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
            linkedCts.Cancel();
        }
    }

    private static async Task PumpWsToDockerAsync(
        Stream dockerStream,
        WebSocket webSocket,
        string activeExecId,
        IDockerService docker,
        CancellationTokenSource linkedCts,
        CancellationToken ct)
    {
        byte[] buffer = ArrayPool<byte>.Shared.Rent(4096);
        try
        {
            while (!ct.IsCancellationRequested && webSocket.State == WebSocketState.Open)
            {
                var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
                if (result.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }

                if (result.Count > 0)
                {
                    // Terminal resize kontrolü: {"type":"resize","cols":80,"rows":24}
                    if (result.MessageType == WebSocketMessageType.Text && 
                        buffer[0] == (byte)'{' && 
                        Encoding.UTF8.GetString(buffer, 0, result.Count).Contains("\"resize\""))
                    {
                        try
                        {
                            var jsonStr = Encoding.UTF8.GetString(buffer, 0, result.Count);
                            using var doc = JsonDocument.Parse(jsonStr);
                            if (doc.RootElement.TryGetProperty("cols", out var colsProp) &&
                                doc.RootElement.TryGetProperty("rows", out var rowsProp))
                            {
                                int cols = colsProp.GetInt32();
                                int rows = rowsProp.GetInt32();
                                _ = docker.ResizeExecAsync(activeExecId, cols, rows, ct);
                            }
                        }
                        catch { }
                    }
                    else
                    {
                        await dockerStream.WriteAsync(buffer.AsMemory(0, result.Count), ct);
                        await dockerStream.FlushAsync(ct);
                    }
                }
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception ex) when (ex is IOException or SocketException or WebSocketException) { }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
            linkedCts.Cancel();
        }
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
