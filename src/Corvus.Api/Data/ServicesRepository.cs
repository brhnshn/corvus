using Dapper;
using System.Data.Common;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

public interface IServicesRepository
{
    Task<List<Service>> GetAllAsync(string? systemId = null);
    Task<Service?> GetByIdAsync(string id);
    Task<Service> CreateManualAsync(CreateServiceRequest request, string? systemId = null);
    Task<Service?> UpdateAsync(string id, UpdateServiceRequest request);
    Task<bool> DeleteAsync(string id);
    Task UpsertDockerServiceAsync(Service service);
    Task SyncDockerServicesAsync(List<string> activeContainerIds);
    Task SyncDockerBatchAsync(List<Service> services, List<string> activeContainerIds);
    Task ReorderAsync(List<string> orderedServiceIds);
    Task<List<Service>> GetPublicServicesAsync();
    Task UpdateSslInfoAsync(string serviceId, int sslExpiryDays, string? sslIssuer);
    Task UpdateStatusAsync(string id, string status);
    Task SaveContainerTagsAsync(string containerId, List<string> tags);
    Task<Dictionary<string, List<string>>> GetAllContainerTagsAsync();
}

public partial class ServicesRepository : IServicesRepository
{
    private readonly IDbConnectionFactory _db;

    public ServicesRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    private const string BaseSelectSql = @"
        SELECT s.id, s.source, s.container_id, s.system_id, s.name, s.description, s.url, s.icon, s.category, s.health_check_url, s.status, s.created_at, s.updated_at,
               s.check_type, s.port, s.ssl_expiry_days, s.ssl_issuer, s.is_public, s.is_uptime_enabled, s.display_order,
               s.check_interval, s.max_retries, s.retry_interval, s.timeout_seconds, s.ignore_tls, s.accepted_status_codes, s.http_method, s.expected_body,
               s.tags,
               o.name AS OverrideName, 
               o.description AS OverrideDescription, 
               o.url AS OverrideUrl, 
               o.icon AS OverrideIcon, 
               o.category AS OverrideCategory,
               o.health_check_url AS OverrideHealthCheckUrl,
               o.check_type AS OverrideCheckType,
               o.port AS OverridePort,
               o.is_public AS OverrideIsPublic,
               o.is_uptime_enabled AS OverrideIsUptimeEnabled,
               o.check_interval AS OverrideCheckInterval,
               o.max_retries AS OverrideMaxRetries,
               o.retry_interval AS OverrideRetryInterval,
               o.timeout_seconds AS OverrideTimeoutSeconds,
               o.ignore_tls AS OverrideIgnoreTls,
               o.accepted_status_codes AS OverrideAcceptedStatusCodes,
               o.http_method AS OverrideHttpMethod,
               o.expected_body AS OverrideExpectedBody,
               o.tags AS OverrideTags
        FROM services s
        LEFT JOIN service_overrides o ON (s.id = o.service_id OR (s.container_id IS NOT NULL AND s.container_id = o.container_id))";

    public async Task<List<Service>> GetAllAsync(string? systemId = null)
    {
        using var conn = (Microsoft.Data.Sqlite.SqliteConnection)_db.CreateConnection();
        string whereClause = "";

        if (!string.IsNullOrWhiteSpace(systemId) && systemId.ToLowerInvariant() != "all")
        {
            whereClause = " WHERE (s.system_id = @systemId OR (@systemId = 'local-host' AND (s.system_id IS NULL OR s.system_id = '' OR s.system_id = 'local-host')))";
        }

        var sql = $"{BaseSelectSql}{whereClause} ORDER BY s.display_order ASC, s.category ASC, s.name ASC";

        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        if (!string.IsNullOrWhiteSpace(systemId) && systemId.ToLowerInvariant() != "all")
        {
            cmd.Parameters.AddWithValue("@systemId", systemId.Trim());
        }

        using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<Service>();
        while (await reader.ReadAsync())
        {
            list.Add(MapReaderToService(reader));
        }
        return list;
    }

    public async Task<List<Service>> GetPublicServicesAsync()
    {
        using var conn = (Microsoft.Data.Sqlite.SqliteConnection)_db.CreateConnection();
        var sql = $@"{BaseSelectSql}
            WHERE COALESCE(o.is_public, s.is_public, 0) = 1
              AND COALESCE(o.is_uptime_enabled, s.is_uptime_enabled, 0) = 1
            ORDER BY s.display_order ASC, s.category ASC, s.name ASC";

        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        using var reader = await cmd.ExecuteReaderAsync();
        var list = new List<Service>();
        while (await reader.ReadAsync())
        {
            list.Add(MapReaderToService(reader));
        }
        return list;
    }

    public async Task<Service?> GetByIdAsync(string id)
    {
        using var conn = (Microsoft.Data.Sqlite.SqliteConnection)_db.CreateConnection();
        var sql = $"{BaseSelectSql} WHERE s.id = @id";

        using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("@id", id);

        using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapReaderToService(reader);
        }
        return null;
    }
}
