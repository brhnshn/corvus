using System;
using System.Buffers;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class ContainersEndpoints
{
    public static void MapContainersEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/containers")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/", async (IDockerService docker) =>
        {
            var containers = await docker.GetContainersAsync();
            return Results.Ok(containers);
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

            var username = httpContext.User.Identity?.Name ?? "admin";
            var logger = loggerFactory.CreateLogger("ContainersEndpoints");
            logger.LogInformation("Audit: User '{Username}' updated tags for container '{ContainerId}' to [{Tags}]",
                username, id, string.Join(", ", cleanTags));

            var tagsJson = JsonSerializer.Serialize(cleanTags, CorvusJsonSerializerContext.Default.ListString);
            broadcaster.Broadcast("container_tags_updated", $"{{\"containerId\":\"{id}\",\"tags\":{tagsJson}}}");

            return Results.Json(
                new GenericApiResponse(true, "Konteyner etiketleri başarıyla güncellendi."),
                CorvusJsonSerializerContext.Default.GenericApiResponse);
        }).RequireAdmin();

        group.MapPost("/{id}/restart", async (string id, IDockerService docker) =>
        {
            var result = await docker.RestartContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container yeniden başlatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container yeniden başlatılamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/start", async (string id, IDockerService docker) =>
        {
            var result = await docker.StartContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container başlatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container başlatılamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/stop", async (string id, IDockerService docker) =>
        {
            var result = await docker.StopContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container durduruldu.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container durdurulamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/pause", async (string id, IDockerService docker) =>
        {
            var result = await docker.PauseContainerAsync(id);
            return result.Success 
                ? Results.Ok(new GenericApiResponse(true, result.Message ?? "Container duraklatıldı.")) 
                : Results.Json(new GenericApiResponse(false, result.Message ?? "Container duraklatılamadı."), 
                               CorvusJsonSerializerContext.Default.GenericApiResponse, 
                               statusCode: result.StatusCode == 200 ? 400 : result.StatusCode);
        }).RequireAdmin();

        group.MapPost("/{id}/unpause", async (string id, IDockerService docker) =>
        {
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

        group.MapGet("/stats-summary", async (IDockerService docker, CancellationToken ct) =>
        {
            var summary = await docker.GetActiveContainersStatsSummaryAsync(ct);
            return Results.Ok(summary);
        });

        group.MapGet("/{id}/stats", async (string id, IDockerService docker, CancellationToken ct) =>
        {
            var stats = await docker.GetContainerStatsAsync(id, ct);
            return stats != null 
                ? Results.Ok(stats) 
                : Results.NotFound(new GenericApiResponse(false, "Stats alınamadı veya container çalışmıyor."));
        });

        group.MapGet("/{id}/logs", async (string id, int? tail, IDockerService docker, CancellationToken ct) =>
        {
            int limit = tail.GetValueOrDefault(100);
            if (limit <= 0) limit = 100;
            if (limit > 1000) limit = 1000;

            var lines = await docker.GetContainerLogsAsync(id, limit, ct);
            return Results.Ok(new ContainerLogsDto(id, lines));
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

            string rawShell = context.Request.Query["shell"].ToString().Trim();
            
            // Güvenli kabuk aday listesi ve akıllı fallback zinciri (/bin/bash -> /bin/sh -> /bin/ash -> sh)
            var defaultShells = new[] { "/bin/bash", "/bin/sh", "/bin/ash", "sh" };
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
                    logger.LogInformation("Konteyner terminali başlatıldı: Container={ContainerId}, Shell={Shell}", id, candidate);
                    break;
                }
                catch (Exception ex)
                {
                    logger.LogDebug(ex, "Kabuk başlatılamadı, fallback deneniyor: Container={ContainerId}, Shell={Shell}", id, candidate);
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

                // Docker -> WebSocket pompası
                var dockerToWsTask = Task.Run(async () =>
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
                }, ct);

                // WebSocket -> Docker pompası (ve resize mesajları)
                var wsToDockerTask = Task.Run(async () =>
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
                }, ct);

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

        group.MapGet("/{id}/inspect", async (string id, IDockerService docker, CancellationToken ct) =>
        {
            var inspect = await docker.InspectContainerAsync(id, ct);
            return inspect != null
                ? Results.Json(inspect, CorvusJsonSerializerContext.Default.DockerContainerInspectInfo)
                : Results.Json(new GenericApiResponse(false, "Container inspect verisi alınamadı."), CorvusJsonSerializerContext.Default.GenericApiResponse, statusCode: 404);
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
    }
}
