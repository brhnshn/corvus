using Dapper;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

public interface IServicesRepository
{
    Task<List<Service>> GetAllAsync();
    Task<Service?> GetByIdAsync(string id);
    Task<Service> CreateManualAsync(CreateServiceRequest request);
    Task<Service?> UpdateAsync(string id, UpdateServiceRequest request);
    Task<bool> DeleteAsync(string id);
    Task UpsertDockerServiceAsync(Service service);
    Task SyncDockerServicesAsync(List<string> activeContainerIds);
    Task SyncDockerBatchAsync(List<Service> services, List<string> activeContainerIds);
    Task ReorderAsync(List<string> orderedServiceIds);
    Task<List<Service>> GetPublicServicesAsync();
    Task UpdateSslInfoAsync(string serviceId, int sslExpiryDays, string? sslIssuer);
    Task UpdateStatusAsync(string id, string status);
}

public class ServicesRepository : IServicesRepository
{
    private readonly IDbConnectionFactory _db;

    public ServicesRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public record ServiceDbRow(
        string id,
        string source,
        string? container_id,
        string name,
        string? description,
        string? url,
        string? icon,
        string? category,
        string? health_check_url,
        string status,
        string created_at,
        string updated_at,
        string? check_type,
        int? port,
        int? ssl_expiry_days,
        string? ssl_issuer,
        int? is_public,
        int? display_order,
        string? OverrideName,
        string? OverrideDescription,
        string? OverrideUrl,
        string? OverrideIcon,
        string? OverrideCategory,
        string? OverrideHealthCheckUrl,
        string? OverrideCheckType,
        int? OverridePort,
        int? OverrideIsPublic
    );

    private static Service MapRowToService(ServiceDbRow r) => new Service
    {
        Id = r.id,
        Source = r.source,
        ContainerId = r.container_id,
        Name = r.OverrideName ?? r.name,
        Description = r.OverrideDescription ?? r.description,
        Url = r.OverrideUrl ?? r.url,
        Icon = r.OverrideIcon ?? r.icon,
        Category = r.OverrideCategory ?? r.category,
        HealthCheckUrl = r.OverrideHealthCheckUrl ?? r.health_check_url,
        Status = r.status,
        CreatedAt = r.created_at,
        UpdatedAt = r.updated_at,
        CheckType = r.OverrideCheckType ?? r.check_type ?? "http",
        Port = r.OverridePort ?? r.port,
        SslExpiryDays = r.ssl_expiry_days,
        SslIssuer = r.ssl_issuer,
        IsPublic = (r.OverrideIsPublic ?? r.is_public ?? 1) == 1,
        DisplayOrder = r.display_order ?? 0
    };

    public async Task<List<Service>> GetAllAsync()
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT s.id, s.source, s.container_id, s.name, s.description, s.url, s.icon, s.category, s.health_check_url, s.status, s.created_at, s.updated_at,
                   s.check_type, s.port, s.ssl_expiry_days, s.ssl_issuer, s.is_public, s.display_order,
                   o.name AS OverrideName, 
                   o.description AS OverrideDescription, 
                   o.url AS OverrideUrl, 
                   o.icon AS OverrideIcon, 
                   o.category AS OverrideCategory,
                   o.health_check_url AS OverrideHealthCheckUrl,
                   o.check_type AS OverrideCheckType,
                   o.port AS OverridePort,
                   o.is_public AS OverrideIsPublic
            FROM services s
            LEFT JOIN service_overrides o ON (s.id = o.service_id OR (s.container_id IS NOT NULL AND s.container_id = o.container_id))
            ORDER BY s.display_order ASC, s.category ASC, s.name ASC";

        var rows = await conn.QueryAsync<ServiceDbRow>(sql);
        return rows.Select(MapRowToService).ToList();
    }

    public async Task<List<Service>> GetPublicServicesAsync()
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT s.id, s.source, s.container_id, s.name, s.description, s.url, s.icon, s.category, s.health_check_url, s.status, s.created_at, s.updated_at,
                   s.check_type, s.port, s.ssl_expiry_days, s.ssl_issuer, s.is_public, s.display_order,
                   o.name AS OverrideName, 
                   o.description AS OverrideDescription, 
                   o.url AS OverrideUrl, 
                   o.icon AS OverrideIcon, 
                   o.category AS OverrideCategory,
                   o.health_check_url AS OverrideHealthCheckUrl,
                   o.check_type AS OverrideCheckType,
                   o.port AS OverridePort,
                   o.is_public AS OverrideIsPublic
            FROM services s
            LEFT JOIN service_overrides o ON (s.id = o.service_id OR (s.container_id IS NOT NULL AND s.container_id = o.container_id))
            WHERE s.is_public = 1
            ORDER BY s.display_order ASC, s.category ASC, s.name ASC";

        var rows = await conn.QueryAsync<ServiceDbRow>(sql);
        return rows.Select(MapRowToService).ToList();
    }

    public async Task<Service?> GetByIdAsync(string id)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT s.id, s.source, s.container_id, s.name, s.description, s.url, s.icon, s.category, s.health_check_url, s.status, s.created_at, s.updated_at,
                   s.check_type, s.port, s.ssl_expiry_days, s.ssl_issuer, s.is_public, s.display_order,
                   o.name AS OverrideName, 
                   o.description AS OverrideDescription, 
                   o.url AS OverrideUrl, 
                   o.icon AS OverrideIcon, 
                   o.category AS OverrideCategory,
                   o.health_check_url AS OverrideHealthCheckUrl,
                   o.check_type AS OverrideCheckType,
                   o.port AS OverridePort,
                   o.is_public AS OverrideIsPublic
            FROM services s
            LEFT JOIN service_overrides o ON (s.id = o.service_id OR (s.container_id IS NOT NULL AND s.container_id = o.container_id))
            WHERE s.id = @id";

        var r = await conn.QuerySingleOrDefaultAsync<ServiceDbRow>(sql, new { id });
        return r == null ? null : MapRowToService(r);
    }

    public async Task<Service> CreateManualAsync(CreateServiceRequest request)
    {
        using var conn = _db.CreateConnection();
        var service = new Service
        {
            Id = Guid.NewGuid().ToString(),
            Source = "manual",
            ContainerId = null,
            Name = request.Name,
            Description = request.Description,
            Url = request.Url,
            Icon = request.Icon,
            Category = request.Category ?? "Diğer",
            HealthCheckUrl = request.HealthCheckUrl,
            Status = "unknown",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o"),
            CheckType = request.CheckType ?? "http",
            Port = request.Port,
            IsPublic = request.IsPublic ?? true
        };

        var sql = @"
            INSERT INTO services (id, source, container_id, name, description, url, icon, category, health_check_url, status, created_at, updated_at, check_type, port, is_public, display_order)
            VALUES (@Id, @Source, @ContainerId, @Name, @Description, @Url, @Icon, @Category, @HealthCheckUrl, @Status, @CreatedAt, @UpdatedAt, @CheckType, @Port, @IsPublicInt, @DisplayOrder)";

        await conn.ExecuteAsync(sql, new {
            service.Id,
            service.Source,
            service.ContainerId,
            service.Name,
            service.Description,
            service.Url,
            service.Icon,
            service.Category,
            service.HealthCheckUrl,
            service.Status,
            service.CreatedAt,
            service.UpdatedAt,
            service.CheckType,
            service.Port,
            IsPublicInt = service.IsPublic ? 1 : 0,
            service.DisplayOrder
        });
        return service;
    }

    public async Task<Service?> UpdateAsync(string id, UpdateServiceRequest request)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null) return null;

        using var conn = _db.CreateConnection();
        string now = DateTime.UtcNow.ToString("o");
        int isPublicInt = (request.IsPublic ?? existing.IsPublic) ? 1 : 0;
        string checkType = request.CheckType ?? existing.CheckType;
        int? port = request.Port ?? existing.Port;

        var sql = @"
            UPDATE services 
            SET name = @Name, description = @Description, url = @Url, icon = @Icon, 
                category = @Category, health_check_url = @HealthCheckUrl, updated_at = @now,
                check_type = @checkType, port = @port, is_public = @isPublicInt
            WHERE id = @id";

        await conn.ExecuteAsync(sql, new { 
            request.Name, 
            request.Description, 
            request.Url, 
            request.Icon, 
            request.Category, 
            request.HealthCheckUrl, 
            now, 
            checkType, 
            port, 
            isPublicInt, 
            id 
        });

        if (existing.Source == "docker")
        {
            string overrideKey = !string.IsNullOrEmpty(existing.ContainerId) ? existing.ContainerId : id;
            var overrideSql = @"
                INSERT INTO service_overrides (container_id, service_id, name, description, url, icon, category, health_check_url, check_type, port, is_public)
                VALUES (@overrideKey, @id, @Name, @Description, @Url, @Icon, @Category, @HealthCheckUrl, @checkType, @port, @isPublicInt)
                ON CONFLICT(container_id) DO UPDATE SET
                    service_id = excluded.service_id,
                    name = excluded.name,
                    description = excluded.description,
                    url = excluded.url,
                    icon = excluded.icon,
                    category = excluded.category,
                    health_check_url = excluded.health_check_url,
                    check_type = excluded.check_type,
                    port = excluded.port,
                    is_public = excluded.is_public";

            await conn.ExecuteAsync(overrideSql, new { 
                overrideKey, 
                id, 
                request.Name, 
                request.Description, 
                request.Url, 
                request.Icon, 
                request.Category,
                request.HealthCheckUrl,
                checkType,
                port,
                isPublicInt
            });
        }

        return await GetByIdAsync(id);
    }

    public async Task ReorderAsync(List<string> orderedServiceIds)
    {
        using var conn = (Microsoft.Data.Sqlite.SqliteConnection)_db.CreateConnection();
        using var tx = conn.BeginTransaction();
        for (int i = 0; i < orderedServiceIds.Count; i++)
        {
            await conn.ExecuteAsync("UPDATE services SET display_order = @order WHERE id = @id", new { order = i, id = orderedServiceIds[i] }, tx);
        }
        tx.Commit();
    }

    public async Task UpdateSslInfoAsync(string serviceId, int sslExpiryDays, string? sslIssuer)
    {
        using var conn = _db.CreateConnection();
        await conn.ExecuteAsync("UPDATE services SET ssl_expiry_days = @sslExpiryDays, ssl_issuer = @sslIssuer WHERE id = @serviceId",
            new { sslExpiryDays, sslIssuer, serviceId });
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null) return false;

        using var conn = _db.CreateConnection();
        if (existing.Source == "manual")
        {
            int count = await conn.ExecuteAsync("DELETE FROM services WHERE id = @id", new { id });
            return count > 0;
        }
        else if (!string.IsNullOrEmpty(existing.ContainerId))
        {
            // Docker servisi silinmez, override'ı temizlenir
            await conn.ExecuteAsync("DELETE FROM service_overrides WHERE container_id = @ContainerId", new { existing.ContainerId });
            return true;
        }

        return false;
    }

    public async Task UpsertDockerServiceAsync(Service service)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT INTO services (id, source, container_id, name, description, url, icon, category, health_check_url, status, created_at, updated_at, check_type, port)
            VALUES (@Id, 'docker', @ContainerId, @Name, @Description, @Url, @Icon, @Category, @HealthCheckUrl, @Status, @CreatedAt, @UpdatedAt, @CheckType, @Port)
            ON CONFLICT(id) DO UPDATE SET
                container_id = excluded.container_id,
                status = CASE 
                    WHEN excluded.status = 'down' THEN 'down'
                    WHEN services.status IN ('down', 'degraded', 'healthy') AND (services.url IS NOT NULL OR services.health_check_url IS NOT NULL OR services.check_type = 'tcp') THEN services.status
                    ELSE excluded.status
                END,
                url = CASE 
                    WHEN (services.url IS NULL OR services.url LIKE 'http://localhost%' OR services.url LIKE 'http://127.0.0.1%') AND (excluded.url IS NOT NULL AND excluded.url NOT LIKE 'http://localhost%' AND excluded.url NOT LIKE 'http://127.0.0.1%') THEN excluded.url
                    ELSE COALESCE(services.url, excluded.url)
                END,
                check_type = COALESCE(services.check_type, excluded.check_type),
                port = COALESCE(services.port, excluded.port),
                updated_at = excluded.updated_at";

        await conn.ExecuteAsync(sql, service);
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

        var upsertSql = @"
            INSERT INTO services (id, source, container_id, name, description, url, icon, category, health_check_url, status, created_at, updated_at, check_type, port)
            VALUES (@Id, 'docker', @ContainerId, @Name, @Description, @Url, @Icon, @Category, @HealthCheckUrl, @Status, @CreatedAt, @UpdatedAt, @CheckType, @Port)
            ON CONFLICT(id) DO UPDATE SET
                container_id = excluded.container_id,
                status = CASE 
                    WHEN excluded.status = 'down' THEN 'down'
                    WHEN services.status IN ('down', 'degraded', 'healthy') AND (services.url IS NOT NULL OR services.health_check_url IS NOT NULL OR services.check_type = 'tcp') THEN services.status
                    ELSE excluded.status
                END,
                url = CASE 
                    WHEN (services.url IS NULL OR services.url LIKE 'http://localhost%' OR services.url LIKE 'http://127.0.0.1%') AND (excluded.url IS NOT NULL AND excluded.url NOT LIKE 'http://localhost%' AND excluded.url NOT LIKE 'http://127.0.0.1%') THEN excluded.url
                    ELSE COALESCE(services.url, excluded.url)
                END,
                check_type = COALESCE(services.check_type, excluded.check_type),
                port = COALESCE(services.port, excluded.port),
                updated_at = excluded.updated_at";

        foreach (var s in services)
        {
            await conn.ExecuteAsync(upsertSql, s, tx);
        }

        if (activeContainerIds.Count == 0)
        {
            await conn.ExecuteAsync("DELETE FROM services WHERE source = 'docker'", transaction: tx);
        }
        else
        {
            await conn.ExecuteAsync(
                "DELETE FROM services WHERE source = 'docker' AND container_id NOT IN @activeContainerIds",
                new { activeContainerIds },
                tx);
        }

        tx.Commit();
    }

    public async Task UpdateStatusAsync(string id, string status)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            UPDATE services 
            SET status = @status, updated_at = @now
            WHERE id = @id";
        await conn.ExecuteAsync(sql, new { id, status, now = DateTime.UtcNow.ToString("o") });
    }
}
