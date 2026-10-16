using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Deployments;
using Corvus.Api.Services;
using Corvus.Api.Services.Deployments;

namespace Corvus.Api.Endpoints;

public static class DeploymentsEndpoints
{
    public static void MapDeploymentsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/deployments")
            .AddEndpointFilter<CorvusAuthFilter>();

        // 1. Son Dağıtımları Listele
        group.MapGet("/", async (string? targetId, int? limit, IDeploymentRepository repo, CancellationToken ct) =>
        {
            int take = limit.HasValue && limit.Value > 0 ? Math.Min(limit.Value, 100) : 50;
            var list = await repo.GetRecentDeploymentsAsync(targetId, take);
            return Results.Json(list, CorvusJsonSerializerContext.Default.ListDeploymentRecord);
        });

        // 2. Tekil Dağıtım Detayı
        group.MapGet("/{id}", async (string id, IDeploymentRepository repo, CancellationToken ct) =>
        {
            var item = await repo.GetByIdAsync(id);
            if (item == null)
            {
                return Results.Json(new DeploymentErrorResponse("Dağıtım kaydı bulunamadı."),
                    CorvusJsonSerializerContext.Default.DeploymentErrorResponse, statusCode: 404);
            }
            return Results.Json(item, CorvusJsonSerializerContext.Default.DeploymentRecord);
        });

        // 3. SSE Canlı Log ve Durum Akışı (Token URL query veya header ile yetkilendirilebilir, SSE stream)
        app.MapGet("/api/deployments/{id}/stream", async (string id, HttpContext context, IDeploymentEngine engine, CancellationToken ct) =>
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
                    // Bağlantı istemci tarafından kesildiğinde sessizce çık
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
                await foreach (var msg in engine.SubscribeStreamAsync(id, linkedCts.Token))
                {
                    await SendDataAsync($"data: {msg.DataJson}\n\n", linkedCts.Token);
                }
            }
            catch (OperationCanceledException)
            {
                // Normal çıkış
            }
            finally
            {
                linkedCts.Cancel();
                try { await pingTask; } catch { }
            }
        }).AddEndpointFilter<CorvusAuthFilter>();

        // 4. Panelden Tek Tıkla Dağıtım Başlatma
        app.MapPost("/api/containers/{id}/deploy", async (
            string id,
            IDeploymentEngine engine,
            HttpContext context,
            CancellationToken ct) =>
        {
            try
            {
                string triggeredBy = context.User?.Identity?.Name ?? "web_ui";
                var record = await engine.StartDeploymentAsync(id, "manual_ui", triggeredBy, pullLatest: true, ct);

                var response = new DeploymentTriggerResponse(
                    record.Id,
                    record.TargetId,
                    record.Status,
                    "Deployment queued successfully."
                );

                return Results.Json(response, CorvusJsonSerializerContext.Default.DeploymentTriggerResponse, statusCode: 202);
            }
            catch (InvalidOperationException ex)
            {
                return Results.Json(new DeploymentErrorResponse(ex.Message),
                    CorvusJsonSerializerContext.Default.DeploymentErrorResponse, statusCode: 409);
            }
            catch (KeyNotFoundException ex)
            {
                return Results.Json(new DeploymentErrorResponse(ex.Message),
                    CorvusJsonSerializerContext.Default.DeploymentErrorResponse, statusCode: 404);
            }
            catch (Exception ex)
            {
                return Results.Json(new DeploymentErrorResponse($"Dağıtım başlatılamadı: {ex.Message}"),
                    CorvusJsonSerializerContext.Default.DeploymentErrorResponse, statusCode: 500);
            }
        }).AddEndpointFilter<CorvusAuthFilter>().RequireAdmin();
    }
}
