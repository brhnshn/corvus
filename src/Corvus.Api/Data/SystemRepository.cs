using Dapper;
using Corvus.Api.Models.Systems;

namespace Corvus.Api.Data;

public class SystemRepository : ISystemRepository
{
    private readonly IDbConnectionFactory _db;

    public SystemRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<List<SystemEntity>> GetAllAsync()
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, name, hostname, ip_address AS IpAddress, os_info AS OsInfo, 
                   agent_version AS AgentVersion, tags_json AS TagsJson, status, 
                   created_at AS CreatedAt, updated_at AS UpdatedAt, last_seen_at AS LastSeenAt
            FROM systems
            ORDER BY name ASC";
        var result = await conn.QueryAsync<SystemEntity>(sql);
        return result.AsList();
    }

    public async Task<SystemEntity?> GetByIdAsync(string id)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, name, hostname, ip_address AS IpAddress, os_info AS OsInfo, 
                   agent_version AS AgentVersion, tags_json AS TagsJson, status, 
                   created_at AS CreatedAt, updated_at AS UpdatedAt, last_seen_at AS LastSeenAt
            FROM systems
            WHERE id = @Id";
        return await conn.QuerySingleOrDefaultAsync<SystemEntity>(sql, new { Id = id });
    }

    public async Task<int> CreateAsync(SystemEntity system)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT INTO systems (id, name, hostname, ip_address, os_info, agent_version, tags_json, status, created_at, updated_at, last_seen_at)
            VALUES (@Id, @Name, @Hostname, @IpAddress, @OsInfo, @AgentVersion, @TagsJson, @Status, @CreatedAt, @UpdatedAt, @LastSeenAt)";
        return await conn.ExecuteAsync(sql, system);
    }

    public async Task<int> UpdateAsync(SystemEntity system)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            UPDATE systems 
            SET name = @Name,
                hostname = @Hostname,
                ip_address = @IpAddress,
                os_info = @OsInfo,
                agent_version = @AgentVersion,
                tags_json = @TagsJson,
                status = @Status,
                updated_at = @UpdatedAt,
                last_seen_at = @LastSeenAt
            WHERE id = @Id";
        return await conn.ExecuteAsync(sql, system);
    }

    public async Task<int> UpdateStatusAsync(string id, string status, string lastSeenAt)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            UPDATE systems 
            SET status = @Status,
                last_seen_at = @LastSeenAt,
                updated_at = @LastSeenAt
            WHERE id = @Id";
        return await conn.ExecuteAsync(sql, new { Id = id, Status = status, LastSeenAt = lastSeenAt });
    }

    public async Task<int> DeleteAsync(string id)
    {
        using var conn = _db.CreateConnection();
        var sql = "DELETE FROM systems WHERE id = @Id";
        return await conn.ExecuteAsync(sql, new { Id = id });
    }

    public async Task<int> UpsertTokenAsync(SystemTokenEntity token)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT INTO system_tokens (id, system_id, token_hash, token_prefix, created_at, expires_at, is_revoked, revoked_at)
            VALUES (@Id, @SystemId, @TokenHash, @TokenPrefix, @CreatedAt, @ExpiresAt, @IsRevoked, @RevokedAt)
            ON CONFLICT(token_hash) DO UPDATE SET
                is_revoked = excluded.is_revoked,
                revoked_at = excluded.revoked_at";
        return await conn.ExecuteAsync(sql, token);
    }

    public async Task<SystemTokenEntity?> GetTokenByHashAsync(string tokenHash)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, system_id AS SystemId, token_hash AS TokenHash, token_prefix AS TokenPrefix,
                   created_at AS CreatedAt, expires_at AS ExpiresAt, is_revoked AS IsRevoked, revoked_at AS RevokedAt
            FROM system_tokens
            WHERE token_hash = @TokenHash";
        return await conn.QuerySingleOrDefaultAsync<SystemTokenEntity>(sql, new { TokenHash = tokenHash });
    }

    public async Task<int> RevokeTokenAsync(string systemId)
    {
        using var conn = _db.CreateConnection();
        var now = DateTime.UtcNow.ToString("o");
        var sql = @"
            UPDATE system_tokens
            SET is_revoked = 1,
                revoked_at = @Now
            WHERE system_id = @SystemId AND is_revoked = 0";
        return await conn.ExecuteAsync(sql, new { SystemId = systemId, Now = now });
    }

    public async Task<int> UpsertContainersCacheAsync(string systemId, List<SystemContainerCacheEntity> containers)
    {
        using var conn = _db.CreateConnection();

        if (containers.Count == 0)
        {
            return await conn.ExecuteAsync("DELETE FROM system_containers_cache WHERE system_id = @SystemId", new { SystemId = systemId });
        }

        var sql = @"
            INSERT INTO system_containers_cache (system_id, container_id, name, image, state, status, cpu_percent, memory_bytes, ports_json, updated_at)
            VALUES (@SystemId, @ContainerId, @Name, @Image, @State, @Status, @CpuPercent, @MemoryBytes, @PortsJson, @UpdatedAt)
            ON CONFLICT(system_id, container_id) DO UPDATE SET
                name = excluded.name,
                image = excluded.image,
                state = excluded.state,
                status = excluded.status,
                cpu_percent = excluded.cpu_percent,
                memory_bytes = excluded.memory_bytes,
                ports_json = excluded.ports_json,
                updated_at = excluded.updated_at";

        int affected = await conn.ExecuteAsync(sql, containers);

        var activeIds = containers.Select(c => c.ContainerId).ToList();
        await conn.ExecuteAsync(
            "DELETE FROM system_containers_cache WHERE system_id = @SystemId AND container_id NOT IN @ActiveIds",
            new { SystemId = systemId, ActiveIds = activeIds });

        return affected;
    }

    public async Task<List<SystemContainerCacheEntity>> GetCachedContainersAsync(string systemId)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT system_id AS SystemId, container_id AS ContainerId, name, image, state, status,
                   cpu_percent AS CpuPercent, memory_bytes AS MemoryBytes, ports_json AS PortsJson, updated_at AS UpdatedAt
            FROM system_containers_cache
            WHERE system_id = @SystemId
            ORDER BY name ASC";
        var result = await conn.QueryAsync<SystemContainerCacheEntity>(sql, new { SystemId = systemId });
        return result.AsList();
    }
}
