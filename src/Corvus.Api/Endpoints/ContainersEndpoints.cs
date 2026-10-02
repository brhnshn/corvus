using System;
using System.Buffers;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
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

            string shell = context.Request.Query["shell"].ToString();
            if (string.IsNullOrWhiteSpace(shell) || (shell != "/bin/sh" && shell != "/bin/bash"))
            {
                shell = "/bin/sh";
            }

            using var webSocket = await context.WebSockets.AcceptWebSocketAsync();

            string? execId = await docker.CreateExecInstanceAsync(id, shell, context.RequestAborted);
            if (string.IsNullOrWhiteSpace(execId))
            {
                byte[] errBytes = Encoding.UTF8.GetBytes($"\r\n\x1b[31m[Hata] Konteyner içinde '{shell}' kabuğu başlatılamadı.\x1b[0m\r\n");
                await webSocket.SendAsync(errBytes, WebSocketMessageType.Text, true, CancellationToken.None);
                await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Exec failed", CancellationToken.None);
                return Results.Empty;
            }

            Stream dockerStream;
            try
            {
                dockerStream = await docker.StartExecStreamAsync(execId, context.RequestAborted);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Docker exec stream başlatılamadı: {ContainerId}", id);
                byte[] errBytes = Encoding.UTF8.GetBytes($"\r\n\x1b[31m[Hata] Docker TTY stream başlatılamadı: {ex.Message}\x1b[0m\r\n");
                await webSocket.SendAsync(errBytes, WebSocketMessageType.Text, true, CancellationToken.None);
                await webSocket.CloseAsync(WebSocketCloseStatus.InternalServerError, "Stream failed", CancellationToken.None);
                return Results.Empty;
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
                                            _ = docker.ResizeExecAsync(execId, cols, rows, ct);
                                        }
                                    }
                                    catch { }
                                }
                                else
                                {
                                    await dockerStream.WriteAsync(buffer, 0, result.Count, ct);
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
    }
}
