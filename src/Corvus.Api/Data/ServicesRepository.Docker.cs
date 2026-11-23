using Dapper;
using System.Data.Common;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

// Docker keşfinden gelen servislerin senkronizasyonu ve konteyner etiket kalıcılığı
public partial class ServicesRepository
{
    // Docker keşfinden gelen satırın eklenmesi/güncellenmesi.
    // Durum: uptime takibi açık değilse otorite Docker'dır; açıksa denetimin yazdığı durum korunur (konteyner durmadıkça).
    // Takip bayrağının etkin değeri kullanıcı tercihinden (service_overrides) okunur; services sütunu yalnız varsayılandır.
    private const string DockerUpsertSql = @"
            INSERT INTO services (id, source, container_id, system_id, name, description, url, icon, category, health_check_url, status, created_at, updated_at, check_type, port, is_public, is_uptime_enabled, display_order, check_interval, max_retries, retry_interval, timeout_seconds, ignore_tls, accepted_status_codes, http_method, tags)
            VALUES (@Id, 'docker', @ContainerId, @SystemId, @Name, @Description, @Url, @Icon, @Category, @HealthCheckUrl, @Status, @CreatedAt, @UpdatedAt, @CheckType, @Port, @IsPublicInt, @IsUptimeEnabledInt, @DisplayOrder, @CheckInterval, @MaxRetries, @RetryInterval, @TimeoutSeconds, @IgnoreTlsInt, @AcceptedStatusCodes, @HttpMethod, @Tags)
            ON CONFLICT(id) DO UPDATE SET
                container_id = excluded.container_id,
                system_id = COALESCE(excluded.system_id, services.system_id, 'local-host'),
                name = excluded.name,
                status = CASE 
                    WHEN COALESCE(
                        (SELECT o.is_uptime_enabled FROM service_overrides o
                         WHERE o.service_id = services.id OR o.container_id = services.container_id
                         LIMIT 1),
                        services.is_uptime_enabled, 0) = 0 THEN excluded.status
                    WHEN excluded.status = 'down' THEN 'down'
                    WHEN services.status IN ('down', 'degraded', 'healthy') THEN services.status
                    ELSE excluded.status
                END,
                url = CASE 
                    WHEN (services.url IS NULL OR services.url LIKE 'http://localhost%' OR services.url LIKE 'http://127.0.0.1%') AND (excluded.url IS NOT NULL AND excluded.url NOT LIKE 'http://localhost%' AND excluded.url NOT LIKE 'http://127.0.0.1%') THEN excluded.url
                    ELSE COALESCE(services.url, excluded.url)
                END,
                check_type = COALESCE(services.check_type, excluded.check_type),
                port = COALESCE(services.port, excluded.port),
                is_uptime_enabled = COALESCE(services.is_uptime_enabled, excluded.is_uptime_enabled),
                tags = CASE 
                    WHEN services.tags IS NOT NULL AND services.tags != '' AND services.tags != '[]' THEN services.tags 
                    ELSE excluded.tags 
                END,
                updated_at = excluded.updated_at";

    private static Task<int> ExecuteDockerUpsertAsync(System.Data.IDbConnection conn, Service s, string fallbackSystemId, System.Data.IDbTransaction? tx = null) =>
        conn.ExecuteAsync(DockerUpsertSql, new {
        s.Id,
        s.ContainerId,
        SystemId = string.IsNullOrWhiteSpace(s.SystemId) ? fallbackSystemId : s.SystemId,
        s.Name,
        s.Description,
        s.Url,
        s.Icon,
        s.Category,
        s.HealthCheckUrl,
        s.Status,
        s.CreatedAt,
        s.UpdatedAt,
        s.CheckType,
        s.Port,
        IsPublicInt = s.IsPublic ? 1 : 0,
        IsUptimeEnabledInt = s.IsUptimeEnabled ? 1 : 0,
        s.DisplayOrder,
        CheckInterval = s.CheckInterval ?? 60,
        MaxRetries = s.MaxRetries ?? 1,
        RetryInterval = s.RetryInterval ?? 30,
        TimeoutSeconds = s.TimeoutSeconds ?? 5,
        IgnoreTlsInt = s.IgnoreTls ? 1 : 0,
        AcceptedStatusCodes = s.AcceptedStatusCodes ?? "200-299",
        HttpMethod = s.HttpMethod ?? "GET",
        Tags = SerializeTags(s.Tags)
    }, tx);

    public async Task UpsertDockerServiceAsync(Service service)
    {
        using var conn = _db.CreateConnection();
        await ExecuteDockerUpsertAsync(conn, service, "local-host");
    }

    public async Task SyncDockerServicesAsync(List<string> activeContainerIds)
    {
        using var conn = _db.CreateConnection();

        if (activeContainerIds.Count == 0)
        {
            // Docker daemon üzerinde hiç container yoksa Docker servislerini temizle
            await conn.ExecuteAsync("DELETE FROM services WHERE source = 'docker'");
        }
        else
        {
            // Docker'dan tamamen kaldırılmış (artık listede olmayan) hayalet container'ları veritabanından sil
            var sql = @"
                DELETE FROM services 
                WHERE source = 'docker' AND container_id NOT IN @activeContainerIds";

            await conn.ExecuteAsync(sql, new { activeContainerIds });
        }
    }

    public async Task SyncDockerBatchAsync(List<Service> services, List<string> activeContainerIds)
    {
        using var conn = (Microsoft.Data.Sqlite.SqliteConnection)_db.CreateConnection();
        using var tx = conn.BeginTransaction();

        string targetSystemId = services.FirstOrDefault()?.SystemId ?? "local-host";
        if (string.IsNullOrWhiteSpace(targetSystemId)) targetSystemId = "local-host";

        var moved = await RebindOrphanedOverridesAsync(conn, tx, services, activeContainerIds, targetSystemId);

        foreach (var s in services)
        {
            await ExecuteDockerUpsertAsync(conn, s, targetSystemId, tx);
        }

        await MoveUptimeHistoryAsync(conn, tx, moved);

        if (activeContainerIds.Count == 0)
        {
            await conn.ExecuteAsync("DELETE FROM services WHERE source = 'docker' AND (system_id = @targetSystemId OR (@targetSystemId = 'local-host' AND (system_id IS NULL OR system_id = '')))", new { targetSystemId }, transaction: tx);
        }
        else
        {
            await conn.ExecuteAsync(
                "DELETE FROM services WHERE source = 'docker' AND (system_id = @targetSystemId OR (@targetSystemId = 'local-host' AND (system_id IS NULL OR system_id = ''))) AND container_id NOT IN @activeContainerIds",
                new { targetSystemId, activeContainerIds },
                tx);
        }

        tx.Commit();
    }

    public async Task SaveContainerTagsAsync(string containerId, List<string> tags)
    {
        using var conn = _db.CreateConnection();
        string serialized = SerializeTags(tags);
        string now = DateTime.UtcNow.ToString("o");

        var sql = @"
            INSERT INTO service_overrides (container_id, tags)
            VALUES (@containerId, @serialized)
            ON CONFLICT(container_id) DO UPDATE SET
                tags = excluded.tags;

            UPDATE services 
            SET tags = @serialized, updated_at = @now
            WHERE container_id = @containerId 
               OR id = @containerId 
               OR id = 'docker_' || substr(@containerId, 1, 12);";

        await conn.ExecuteAsync(sql, new { containerId, serialized, now });
    }

    public record ContainerTagsDbRow(string container_id, string? tags);

    public async Task<Dictionary<string, List<string>>> GetAllContainerTagsAsync()
    {
        using var conn = (Microsoft.Data.Sqlite.SqliteConnection)_db.CreateConnection();
        var sql = "SELECT container_id, tags FROM service_overrides WHERE tags IS NOT NULL AND tags != '' AND tags != '[]'";
        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        using var reader = await cmd.ExecuteReaderAsync();
        var dict = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        while (await reader.ReadAsync())
        {
            string containerId = reader.IsDBNull(0) ? "" : reader.GetString(0);
            string? tags = reader.IsDBNull(1) ? null : reader.GetString(1);
            if (!string.IsNullOrWhiteSpace(containerId))
            {
                var parsed = ParseTags(tags);
                dict[containerId] = parsed;
                if (containerId.Length >= 12)
                {
                    dict[containerId[..12]] = parsed;
                }
            }
        }
        return dict;
    }
}
