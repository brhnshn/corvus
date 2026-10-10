using Dapper;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

public interface IActivityLogRepository
{
    Task InsertAsync(ActivityLogEntry entry);
    Task InsertBatchAsync(IEnumerable<ActivityLogEntry> entries);
    Task<ActivityLogPagedResult> GetPagedAsync(int page = 1, int limit = 50, string? category = null, string? search = null);
    Task CleanupOldLogsAsync(int retentionDays = 90);
}

public class ActivityLogRepository : IActivityLogRepository
{
    private readonly IDbConnectionFactory _db;

    public ActivityLogRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public record ActivityLogDbRow(
        string id,
        string actor_username,
        string action_type,
        string category,
        string target_resource,
        string? details_json,
        string? ip_address,
        string created_at);

    private static ActivityLogEntry MapToModel(ActivityLogDbRow r) => new()
    {
        Id = r.id,
        ActorUsername = r.actor_username,
        ActionType = r.action_type,
        Category = r.category,
        TargetResource = r.target_resource,
        DetailsJson = r.details_json,
        IpAddress = r.ip_address,
        CreatedAt = DateTime.TryParse(r.created_at, out var dt) ? dt : DateTime.UtcNow
    };

    public async Task InsertAsync(ActivityLogEntry entry)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            INSERT INTO activity_logs (id, actor_username, action_type, category, target_resource, details_json, ip_address, created_at)
            VALUES (@Id, @ActorUsername, @ActionType, @Category, @TargetResource, @DetailsJson, @IpAddress, @CreatedAt);";

        await conn.ExecuteAsync(sql, new
        {
            entry.Id,
            entry.ActorUsername,
            entry.ActionType,
            entry.Category,
            entry.TargetResource,
            entry.DetailsJson,
            entry.IpAddress,
            CreatedAt = entry.CreatedAt.ToString("o")
        });
    }

    public async Task InsertBatchAsync(IEnumerable<ActivityLogEntry> entries)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            INSERT INTO activity_logs (id, actor_username, action_type, category, target_resource, details_json, ip_address, created_at)
            VALUES (@Id, @ActorUsername, @ActionType, @Category, @TargetResource, @DetailsJson, @IpAddress, @CreatedAt);";

        var paramsList = entries.Select(e => new
        {
            e.Id,
            e.ActorUsername,
            e.ActionType,
            e.Category,
            e.TargetResource,
            e.DetailsJson,
            e.IpAddress,
            CreatedAt = e.CreatedAt.ToString("o")
        });

        await conn.ExecuteAsync(sql, paramsList);
    }

    public async Task<ActivityLogPagedResult> GetPagedAsync(int page = 1, int limit = 50, string? category = null, string? search = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 100) limit = 100;
        int offset = (page - 1) * limit;

        using var conn = _db.CreateConnection();

        var whereClauses = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(category) && category.ToLowerInvariant() != "all")
        {
            whereClauses.Add("category = @Category");
            parameters.Add("Category", category.Trim().ToLowerInvariant());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            whereClauses.Add("(target_resource LIKE @Search OR actor_username LIKE @Search OR action_type LIKE @Search)");
            parameters.Add("Search", $"%{search.Trim()}%");
        }

        string whereSql = whereClauses.Count > 0 ? "WHERE " + string.Join(" AND ", whereClauses) : "";

        string countSql = $"SELECT COUNT(*) FROM activity_logs {whereSql};";
        int totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

        string querySql = $@"
            SELECT id, actor_username, action_type, category, target_resource, details_json, ip_address, created_at 
            FROM activity_logs 
            {whereSql} 
            ORDER BY created_at DESC 
            LIMIT @Limit OFFSET @Offset;";

        parameters.Add("Limit", limit);
        parameters.Add("Offset", offset);

        var rows = await conn.QueryAsync<ActivityLogDbRow>(querySql, parameters);
        var items = rows.Select(MapToModel).ToList();

        return new ActivityLogPagedResult
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = limit,
            TotalPages = (int)Math.Ceiling((double)totalCount / limit)
        };
    }

    public async Task CleanupOldLogsAsync(int retentionDays = 90)
    {
        if (retentionDays <= 0) return;
        using var conn = _db.CreateConnection();
        var cutoff = DateTime.UtcNow.AddDays(-retentionDays).ToString("o");
        const string sql = "DELETE FROM activity_logs WHERE created_at < @Cutoff;";
        await conn.ExecuteAsync(sql, new { Cutoff = cutoff });
    }
}
