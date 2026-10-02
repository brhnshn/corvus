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
    }
}
