using System.Text.Json;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class StreamEndpoints
{
    public static void MapStreamEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/stream/events", async (HttpContext context, IEventBroadcaster broadcaster, CancellationToken ct) =>
        {
            context.Response.Headers.ContentType = "text/event-stream";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers["X-Accel-Buffering"] = "no";

            // HTTP/2 ve HTTP/3 spesifikasyonlarına (RFC 7540 Section 8.1.2.2) göre Connection başlığı YASAKTIR.
            // Sunucu HTTP/2 üzerinden Connection başlığı dönerse tarayıcılar net::ERR_HTTP2_PROTOCOL_ERROR fırlatır.
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
                    // İstemci bağlantıyı kestiğinde (RST_STREAM / socket closed) sessizce sonlan
                }
                finally
                {
                    writeLock.Release();
                }
            }

            // İlk bağlantı selamlama sinyali
            await SendDataAsync("data: {\"eventType\":\"connected\",\"payload\":\"{}\"}\n\n", ct);

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
                await foreach (var evt in broadcaster.SubscribeAsync(linkedCts.Token))
                {
                    string json = JsonSerializer.Serialize(evt, CorvusJsonSerializerContext.Default.ServerEventDto);
                    await SendDataAsync($"data: {json}\n\n", linkedCts.Token);
                }
            }
            catch (OperationCanceledException)
            {
                // İstemci bağlantıyı kapattığında normal sonlanma
            }
            finally
            {
                linkedCts.Cancel();
                try { await pingTask; } catch { }
            }
        }).AddEndpointFilter<CorvusAuthFilter>();
    }
}
