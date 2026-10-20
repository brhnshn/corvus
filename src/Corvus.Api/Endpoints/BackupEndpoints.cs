using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class BackupEndpoints
{
    private static readonly SemaphoreSlim BackupLock = new(1, 1);

    public static void MapBackupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api")
            .AddEndpointFilter<CorvusAuthFilter>();

        // Corvus Veritabanı Yedek İndirme (Dahili Sıcak Yedek Snapshot - DoS ve kilit korumalı)
        group.MapGet("/backup/download", async (
            IDbConnectionFactory db,
            IBackupRepository repo,
            IEventBroadcaster broadcaster,
            CancellationToken ct) =>
        {
            if (!await BackupLock.WaitAsync(TimeSpan.FromSeconds(5), ct))
            {
                return Results.Json(
                    new GenericApiResponse(false, "Halihazırda devam eden bir veritabanı yedekleme işlemi mevcut. Lütfen biraz sonra tekrar deneyin."),
                    CorvusJsonSerializerContext.Default.GenericApiResponse,
                    statusCode: StatusCodes.Status429TooManyRequests);
            }

            string dbPath = db.DatabasePath;
            if (!File.Exists(dbPath))
            {
                BackupLock.Release();
                return Results.NotFound(new GenericApiResponse(false, "Veritabanı dosyası bulunamadı."));
            }

            string tempDir = Path.GetTempPath();
            string tempFile = Path.Combine(tempDir, $"corvus-backup-{Guid.NewGuid():N}.db");

            try
            {
                // SQLite VACUUM INTO ile tutarlı, fragmentasyonsuz anlık snapshot oluştur
                using (var conn = db.CreateConnection())
                {
                    using var cmd = conn.CreateCommand();
                    string safeSqlPath = tempFile.Replace('\\', '/').Replace("'", "''");
                    cmd.CommandText = $"VACUUM INTO '{safeSqlPath}';";
                    cmd.ExecuteNonQuery();
                }

                long sizeBytes = new FileInfo(tempFile).Length;

                // Dahili yedekleme kaydını sisteme işle
                var evt = new BackupEvent
                {
                    Token = "internal_corvus_db",
                    ReceivedAt = DateTime.UtcNow.ToString("o"),
                    Status = "success",
                    SizeBytes = sizeBytes,
                    Message = "Corvus veritabanı yedeği alındı"
                };
                await repo.InsertAsync(evt);
                var payloadJson = JsonSerializer.Serialize(new PushReceivedEventPayload("internal_corvus_db", "success"), CorvusJsonSerializerContext.Default.PushReceivedEventPayload);
                broadcaster.Broadcast("push_received", payloadJson);

                string fileName = $"corvus-backup-{DateTime.UtcNow:yyyyMMdd-HHmmss}.db";
                var fileStream = new FileStream(tempFile, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.DeleteOnClose);
                return Results.File(fileStream, "application/x-sqlite3", fileName);
            }
            catch
            {
                if (File.Exists(tempFile))
                {
                    try { File.Delete(tempFile); } catch { }
                }
                throw;
            }
            finally
            {
                BackupLock.Release();
            }
        }).RequireAdmin();

        // Backup event listesi
        group.MapGet("/backup-events", async (int? limit, IBackupRepository repo, HttpContext context) =>
        {
            var events = await repo.GetRecentAsync(limit ?? 10);
            string? role = context.Items["Corvus_Role"] as string;
            bool isAdmin = string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase);

            foreach (var ev in events)
            {
                if (!isAdmin && !string.IsNullOrEmpty(ev.Token))
                {
                    ev.Token = "***";
                }
            }

            return Results.Ok(events);
        });
    }
}
