using Dapper;
using System.Data.Common;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

// Manuel servis oluşturma, güncelleme, sıralama, durum/SSL güncelleme ve silme işlemleri
public partial class ServicesRepository
{
    public async Task<Service> CreateManualAsync(CreateServiceRequest request, string? systemId = null)
    {
        using var conn = _db.CreateConnection();
        var tags = request.Tags ?? new List<string>();
        var effectiveSystemId = !string.IsNullOrWhiteSpace(request.SystemId)
            ? request.SystemId.Trim()
            : (!string.IsNullOrWhiteSpace(systemId) ? systemId.Trim() : "local-host");

        var service = new Service
        {
            Id = Guid.NewGuid().ToString(),
            Source = "manual",
            ContainerId = null,
            SystemId = effectiveSystemId,
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
            IsPublic = request.IsPublic ?? false,
            IsUptimeEnabled = request.IsUptimeEnabled ?? true,
            CheckInterval = request.CheckInterval ?? 60,
            MaxRetries = request.MaxRetries ?? 1,
            RetryInterval = request.RetryInterval ?? 30,
            TimeoutSeconds = request.TimeoutSeconds ?? 5,
            IgnoreTls = request.IgnoreTls ?? false,
            AcceptedStatusCodes = request.AcceptedStatusCodes ?? "200-299",
            HttpMethod = request.HttpMethod ?? "GET",
            ExpectedBody = request.ExpectedBody,
            Tags = tags
        };

        var sql = @"
            INSERT INTO services (id, source, container_id, system_id, name, description, url, icon, category, health_check_url, status, created_at, updated_at, check_type, port, is_public, is_uptime_enabled, display_order, check_interval, max_retries, retry_interval, timeout_seconds, ignore_tls, accepted_status_codes, http_method, expected_body, tags)
            VALUES (@Id, @Source, @ContainerId, @SystemId, @Name, @Description, @Url, @Icon, @Category, @HealthCheckUrl, @Status, @CreatedAt, @UpdatedAt, @CheckType, @Port, @IsPublicInt, @IsUptimeEnabledInt, @DisplayOrder, @CheckInterval, @MaxRetries, @RetryInterval, @TimeoutSeconds, @IgnoreTlsInt, @AcceptedStatusCodes, @HttpMethod, @ExpectedBody, @Tags)";

        await conn.ExecuteAsync(sql, new {
            service.Id,
            service.Source,
            service.ContainerId,
            service.SystemId,
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
            IsUptimeEnabledInt = service.IsUptimeEnabled ? 1 : 0,
            service.DisplayOrder,
            service.CheckInterval,
            service.MaxRetries,
            service.RetryInterval,
            service.TimeoutSeconds,
            IgnoreTlsInt = service.IgnoreTls ? 1 : 0,
            service.AcceptedStatusCodes,
            service.HttpMethod,
            service.ExpectedBody,
            Tags = SerializeTags(tags)
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
        int isUptimeEnabledInt = (request.IsUptimeEnabled ?? existing.IsUptimeEnabled) ? 1 : 0;
        string checkType = request.CheckType ?? existing.CheckType;
        int? port = request.Port ?? existing.Port;
        int checkInterval = request.CheckInterval ?? existing.CheckInterval ?? 60;
        int maxRetries = request.MaxRetries ?? existing.MaxRetries ?? 1;
        int retryInterval = request.RetryInterval ?? existing.RetryInterval ?? 30;
        int timeoutSeconds = request.TimeoutSeconds ?? existing.TimeoutSeconds ?? 5;
        int ignoreTlsInt = (request.IgnoreTls ?? existing.IgnoreTls) ? 1 : 0;
        string acceptedStatusCodes = request.AcceptedStatusCodes ?? existing.AcceptedStatusCodes ?? "200-299";
        string httpMethod = request.HttpMethod ?? existing.HttpMethod ?? "GET";
        string? expectedBody = request.ExpectedBody ?? existing.ExpectedBody;
        string tagsSerialized = request.Tags != null ? SerializeTags(request.Tags) : SerializeTags(existing.Tags);

        var sql = @"
            UPDATE services 
            SET name = @Name, description = @Description, url = @Url, icon = @Icon, 
                category = @Category, health_check_url = @HealthCheckUrl, updated_at = @now,
                check_type = @checkType, port = @port, is_public = @isPublicInt, is_uptime_enabled = @isUptimeEnabledInt,
                check_interval = @checkInterval, max_retries = @maxRetries, retry_interval = @retryInterval,
                timeout_seconds = @timeoutSeconds, ignore_tls = @ignoreTlsInt,
                accepted_status_codes = @acceptedStatusCodes, http_method = @httpMethod,
                expected_body = @expectedBody, tags = @tagsSerialized
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
            isUptimeEnabledInt,
            checkInterval,
            maxRetries,
            retryInterval,
            timeoutSeconds,
            ignoreTlsInt,
            acceptedStatusCodes,
            httpMethod,
            expectedBody,
            tagsSerialized,
            id 
        });

        if (existing.Source == "docker")
        {
            string overrideKey = !string.IsNullOrEmpty(existing.ContainerId) ? existing.ContainerId : id;
            var overrideSql = @"
                INSERT INTO service_overrides (container_id, service_id, name, description, url, icon, category, health_check_url, check_type, port, is_public, is_uptime_enabled, check_interval, max_retries, retry_interval, timeout_seconds, ignore_tls, accepted_status_codes, http_method, expected_body, tags)
                VALUES (@overrideKey, @id, @Name, @Description, @Url, @Icon, @Category, @HealthCheckUrl, @checkType, @port, @isPublicInt, @isUptimeEnabledInt, @checkInterval, @maxRetries, @retryInterval, @timeoutSeconds, @ignoreTlsInt, @acceptedStatusCodes, @httpMethod, @expectedBody, @tagsSerialized)
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
                    is_public = excluded.is_public,
                    is_uptime_enabled = excluded.is_uptime_enabled,
                    check_interval = excluded.check_interval,
                    max_retries = excluded.max_retries,
                    retry_interval = excluded.retry_interval,
                    timeout_seconds = excluded.timeout_seconds,
                    ignore_tls = excluded.ignore_tls,
                    accepted_status_codes = excluded.accepted_status_codes,
                    http_method = excluded.http_method,
                    expected_body = excluded.expected_body,
                    tags = excluded.tags";

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
                isPublicInt, 
                isUptimeEnabledInt,
                checkInterval,
                maxRetries,
                retryInterval,
                timeoutSeconds,
                ignoreTlsInt,
                acceptedStatusCodes,
                httpMethod,
                expectedBody,
                tagsSerialized
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
