using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class BackupEndpoints
{
    public static void MapBackupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api")
            .AddEndpointFilter<CorvusAuthFilter>();

        // Corvus Veritabanı Yedek İndirme (Dahili Sıcak Yedek Snapshot)
        group.MapGet("/backup/download", async (
            IDbConnectionFactory db,
            IBackupRepository repo,
            IEventBroadcaster broadcaster) =>
        {
            string dbPath = db.DatabasePath;
            if (!File.Exists(dbPath))
            {
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
                broadcaster.Broadcast("push_received", $"{{\"token\":\"internal_corvus_db\",\"status\":\"success\"}}");

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
        });

        // Backup event listesi
        group.MapGet("/backup-events", async (int? limit, IBackupRepository repo) =>
        {
            var events = await repo.GetRecentAsync(limit ?? 10);
            return Results.Ok(events);
        });
    }
}
