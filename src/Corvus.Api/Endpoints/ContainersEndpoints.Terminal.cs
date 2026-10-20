using System.Buffers;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static partial class ContainersEndpoints
{
    private static void MapTerminalEndpoints(RouteGroupBuilder group)
    {
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
}
