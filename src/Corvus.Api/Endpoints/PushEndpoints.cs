using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class PushEndpoints
{
    public static void MapPushEndpoints(this IEndpointRouteBuilder app)
    {
        // Push monitor endpoint (backup.sh vb. harici scriptler ve cron bildirimleri)
        app.MapPost("/api/push/{token}", async (
            string token, 
            PushBackupRequest? body, 
            IBackupRepository repo, 
            IPushMonitorRepository pushRepo,
            ISettingsRepository settingsRepo,
            IEventBroadcaster broadcaster) =>
        {
            var monitor = await pushRepo.GetByTokenAsync(token);
            string? backupToken = await settingsRepo.GetAsync("backup_push_token");
            bool isBackupToken = !string.IsNullOrEmpty(backupToken) && string.Equals(backupToken, token, StringComparison.Ordinal);

            if (monitor == null && !isBackupToken)
            {
                return Results.NotFound(new GenericApiResponse(false, "Geçersiz veya bulunamayan push belirteci."));
            }

            var evt = new BackupEvent
            {
                Token = token,
                ReceivedAt = DateTime.UtcNow.ToString("o"),
                Status = body?.Status?.ToLowerInvariant() == "failure" ? "failure" : "success",
                SizeBytes = body?.SizeBytes,
                Message = body?.Message
            };

            await repo.InsertAsync(evt);
            if (monitor != null)
            {
                await pushRepo.RecordPingAsync(token);
            }

            var payloadJson = JsonSerializer.Serialize(
                new PushReceivedEventPayload(token, evt.Status),
                CorvusJsonSerializerContext.Default.PushReceivedEventPayload);
            broadcaster.Broadcast("push_received", payloadJson);

            return Results.Ok(new GenericApiResponse(true, "Push bildirimi başarıyla kaydedildi."));
        });

        // Alternatif query param ile push GET (örn. curl http://corvus/api/push/token?status=up&msg=OK)
        app.MapGet("/api/push/{token}", async (
            string token, 
            string? status, 
            string? msg, 
            IBackupRepository repo, 
            IPushMonitorRepository pushRepo,
            ISettingsRepository settingsRepo,
            IEventBroadcaster broadcaster) =>
        {
            var monitor = await pushRepo.GetByTokenAsync(token);
            string? backupToken = await settingsRepo.GetAsync("backup_push_token");
            bool isBackupToken = !string.IsNullOrEmpty(backupToken) && string.Equals(backupToken, token, StringComparison.Ordinal);

            if (monitor == null && !isBackupToken)
            {
                return Results.NotFound(new GenericApiResponse(false, "Geçersiz veya bulunamayan push belirteci."));
            }

            var evt = new BackupEvent
            {
                Token = token,
                ReceivedAt = DateTime.UtcNow.ToString("o"),
                Status = status?.ToLowerInvariant() == "failure" ? "failure" : "success",
                Message = msg
            };

            await repo.InsertAsync(evt);
            if (monitor != null)
            {
                await pushRepo.RecordPingAsync(token);
            }

            var payloadJson = JsonSerializer.Serialize(
                new PushReceivedEventPayload(token, evt.Status),
                CorvusJsonSerializerContext.Default.PushReceivedEventPayload);
            broadcaster.Broadcast("push_received", payloadJson);

            return Results.Ok(new GenericApiResponse(true, "Push bildirimi başarıyla kaydedildi."));
        });

        // Dead Man's Snitch Monitör Yönetimi (Hem /api/push-monitors hem de /api/push/monitors desteklenir)
        MapPushMonitorRoutes(app.MapGroup("/api/push-monitors"));
        MapPushMonitorRoutes(app.MapGroup("/api/push/monitors"));
    }

    private static void MapPushMonitorRoutes(RouteGroupBuilder group)
    {
        group.AddEndpointFilter<CorvusAuthFilter>()
             .RequireAdmin();

        group.MapGet("/", async (IPushMonitorRepository pushRepo) =>
        {
            var monitors = await pushRepo.GetAllAsync();
            return Results.Ok(monitors);
        }).RequireAdmin();

        group.MapPost("/", async (CreatePushMonitorRequest request, IPushMonitorRepository pushRepo) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new GenericApiResponse(false, "Monitör ismi gereklidir."));
            }

            string token = string.IsNullOrWhiteSpace(request.Token)
                ? Guid.NewGuid().ToString("N")[..16]
                : request.Token.Trim();

            var monitor = new PushMonitor
            {
                Id = Guid.NewGuid().ToString(),
                Token = token,
                Name = request.Name.Trim(),
                ExpectedIntervalMinutes = request.ExpectedIntervalMinutes > 0 ? request.ExpectedIntervalMinutes : 1440,
                GracePeriodMinutes = request.GracePeriodMinutes >= 0 ? request.GracePeriodMinutes : 60,
                Status = "unknown",
                CreatedAt = DateTime.UtcNow.ToString("o")
            };

            await pushRepo.CreateAsync(monitor);
            return Results.Ok(monitor);
        }).RequireAdmin();

        group.MapPut("/{id}", async (string id, UpdatePushMonitorRequest request, IPushMonitorRepository pushRepo) =>
        {
            var existing = await pushRepo.GetByIdAsync(id);
            if (existing == null) return Results.NotFound(new GenericApiResponse(false, "Monitör bulunamadı."));

            existing.Name = request.Name;
            existing.ExpectedIntervalMinutes = request.ExpectedIntervalMinutes;
            existing.GracePeriodMinutes = request.GracePeriodMinutes;

            await pushRepo.UpdateAsync(existing);
            return Results.Ok(existing);
        }).RequireAdmin();

        group.MapDelete("/{id}", async (string id, IPushMonitorRepository pushRepo) =>
        {
            bool deleted = await pushRepo.DeleteAsync(id);
            return deleted 
                ? Results.Ok(new GenericApiResponse(true, "Monitör silindi.")) 
                : Results.NotFound(new GenericApiResponse(false, "Monitör bulunamadı."));
        }).RequireAdmin();
    }
}
