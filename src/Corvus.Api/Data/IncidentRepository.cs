using Dapper;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

public interface IIncidentRepository
{
    Task<List<ServiceIncident>> GetAllAsync();
    Task<List<ServiceIncident>> GetActiveAsync();
    Task<ServiceIncident?> GetByIdAsync(string id);
    Task<ServiceIncident> CreateAsync(CreateIncidentRequest request);
    Task<ServiceIncident?> UpdateAsync(string id, UpdateIncidentRequest request);
    Task<bool> ResolveAsync(string id);
    Task<bool> DeleteAsync(string id);
}

public class IncidentRepository : IIncidentRepository
{
    private readonly IDbConnectionFactory _db;

    public IncidentRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public record ServiceIncidentDbRow(
        string id,
        string title,
        string message,
        string severity,
        int is_pinned,
        string status,
        string created_at,
        string? resolved_at
    );

    private static ServiceIncident MapRow(ServiceIncidentDbRow r) => new()
    {
        Id = r.id,
        Title = r.title,
        Message = r.message,
        Severity = r.severity,
        IsPinned = r.is_pinned == 1,
        Status = r.status,
        CreatedAt = r.created_at,
        ResolvedAt = r.resolved_at
    };

    public async Task<List<ServiceIncident>> GetAllAsync()
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, title, message, severity, is_pinned, status, created_at, resolved_at
            FROM service_incidents
            ORDER BY created_at DESC";

        var rows = await conn.QueryAsync<ServiceIncidentDbRow>(sql);
        var list = new List<ServiceIncident>();
        foreach (var r in rows)
        {
            list.Add(MapRow(r));
        }
        return list;
    }

    public async Task<List<ServiceIncident>> GetActiveAsync()
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, title, message, severity, is_pinned, status, created_at, resolved_at
            FROM service_incidents
            WHERE status != 'resolved' OR is_pinned = 1
            ORDER BY is_pinned DESC, created_at DESC";

        var rows = await conn.QueryAsync<ServiceIncidentDbRow>(sql);
        var list = new List<ServiceIncident>();
        foreach (var r in rows)
        {
            list.Add(MapRow(r));
        }
        return list;
    }

    public async Task<ServiceIncident?> GetByIdAsync(string id)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, title, message, severity, is_pinned, status, created_at, resolved_at
            FROM service_incidents
            WHERE id = @id";

        var row = await conn.QuerySingleOrDefaultAsync<ServiceIncidentDbRow>(sql, new { id });
        return row == null ? null : MapRow(row);
    }

    public async Task<ServiceIncident> CreateAsync(CreateIncidentRequest request)
    {
        using var conn = _db.CreateConnection();
        var now = DateTime.UtcNow.ToString("o");
        var incident = new ServiceIncident
        {
            Id = Guid.NewGuid().ToString(),
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            Severity = string.IsNullOrWhiteSpace(request.Severity) ? "info" : request.Severity.Trim(),
            IsPinned = request.IsPinned ?? true,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "investigating" : request.Status.Trim(),
            CreatedAt = now,
            ResolvedAt = (request.Status == "resolved") ? now : null
        };

        var sql = @"
            INSERT INTO service_incidents (id, title, message, severity, is_pinned, status, created_at, resolved_at)
            VALUES (@id, @title, @message, @severity, @is_pinned, @status, @created_at, @resolved_at)";

        await conn.ExecuteAsync(sql, new
        {
            id = incident.Id,
            title = incident.Title,
            message = incident.Message,
            severity = incident.Severity,
            is_pinned = incident.IsPinned ? 1 : 0,
            status = incident.Status,
            created_at = incident.CreatedAt,
            resolved_at = incident.ResolvedAt
        });

        return incident;
    }

    public async Task<ServiceIncident?> UpdateAsync(string id, UpdateIncidentRequest request)
    {
        var existing = await GetByIdAsync(id);
        if (existing == null) return null;

        using var conn = _db.CreateConnection();
        string? resolvedAt = request.Status == "resolved"
            ? (existing.ResolvedAt ?? DateTime.UtcNow.ToString("o"))
            : null;

        var sql = @"
            UPDATE service_incidents
            SET title = @title,
                message = @message,
                severity = @severity,
                is_pinned = @is_pinned,
                status = @status,
                resolved_at = @resolved_at
            WHERE id = @id";

        int affected = await conn.ExecuteAsync(sql, new
        {
            id,
            title = request.Title.Trim(),
            message = request.Message.Trim(),
            severity = request.Severity.Trim(),
            is_pinned = request.IsPinned ? 1 : 0,
            status = request.Status.Trim(),
            resolved_at = resolvedAt
        });

        if (affected == 0) return null;

        return new ServiceIncident
        {
            Id = id,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            Severity = request.Severity.Trim(),
            IsPinned = request.IsPinned,
            Status = request.Status.Trim(),
            CreatedAt = existing.CreatedAt,
            ResolvedAt = resolvedAt
        };
    }

    public async Task<bool> ResolveAsync(string id)
    {
        using var conn = _db.CreateConnection();
        string now = DateTime.UtcNow.ToString("o");
        var sql = @"
            UPDATE service_incidents
            SET status = 'resolved',
                resolved_at = @now,
                is_pinned = 0
            WHERE id = @id";

        int affected = await conn.ExecuteAsync(sql, new { id, now });
        return affected > 0;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        using var conn = _db.CreateConnection();
        int affected = await conn.ExecuteAsync("DELETE FROM service_incidents WHERE id = @id", new { id });
        return affected > 0;
    }
}
