using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class SettingsEndpoints
{
    public static void MapSettingsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapGet("/settings", async (ISettingsRepository repo) =>
        {
            var settings = await repo.GetAllAsync();
            var masked = new Dictionary<string, string>(settings);
            string[] sensitiveKeys =
            [
                "smtp_pass",
                "notification_telegram_bot_token",
                "notification_discord_webhook_url",
                "notification_slack_webhook_url",
                "notification_webhook_url",
                "deploy_webhook_token"
            ];

            foreach (var key in sensitiveKeys)
            {
                if (masked.TryGetValue(key, out var val) && !string.IsNullOrEmpty(val))
                {
                    masked[key] = "******";
                }
            }

            return Results.Ok(masked);
        }).RequireAdmin();

        group.MapGet("/settings/public", async (ISettingsRepository repo) =>
        {
            var all = await repo.GetAllAsync();
            var publicDict = new Dictionary<string, string>();
            string[] publicKeys = ["system_language", "theme", "refresh_interval"];
            foreach (var key in publicKeys)
            {
                if (all.TryGetValue(key, out var val))
                {
                    publicDict[key] = val;
                }
            }
            return Results.Ok(publicDict);
        }).AllowViewer();

        group.MapPut("/settings", async (Dictionary<string, string> settings, ISettingsRepository repo) =>
        {
            var existing = await repo.GetAllAsync();
            var toSave = new Dictionary<string, string>();
            foreach (var (k, v) in settings)
            {
                if (v == "******" && existing.TryGetValue(k, out var oldVal))
                {
                    toSave[k] = oldVal;
                }
                else
                {
                    toSave[k] = v;
                }
            }
            await repo.SetBatchAsync(toSave);
            return Results.Ok(new GenericApiResponse(true, "Ayarlar kaydedildi."));
        }).RequireAdmin();

        group.MapGet("/settings/db-stats", (IDbConnectionFactory dbFactory) =>
        {
            var dbPath = dbFactory.DatabasePath;
            var walPath = $"{dbPath}-wal";
            var shmPath = $"{dbPath}-shm";

            long sizeBytes = File.Exists(dbPath) ? new FileInfo(dbPath).Length : 0;
            long walSizeBytes = File.Exists(walPath) ? new FileInfo(walPath).Length : 0;
            long shmSizeBytes = File.Exists(shmPath) ? new FileInfo(shmPath).Length : 0;
            long totalBytes = sizeBytes + walSizeBytes + shmSizeBytes;

            string formatted = totalBytes switch
            {
                >= 1024 * 1024 * 1024 => $"{(double)totalBytes / (1024 * 1024 * 1024):F2} GB",
                >= 1024 * 1024 => $"{(double)totalBytes / (1024 * 1024):F1} MB",
                >= 1024 => $"{(double)totalBytes / 1024:F0} KB",
                _ => $"{totalBytes} B"
            };

            return Results.Ok(new DbStatsResponse(
                totalBytes,
                sizeBytes,
                walSizeBytes,
                formatted
            ));
        });

        group.MapGet("/version", async (IUpdateCheckerService updateChecker, CancellationToken ct) =>
        {
            var info = await updateChecker.GetVersionInfoAsync(ct);
            return Results.Ok(info);
        });
    }
}
