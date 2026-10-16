using Dapper;
using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Data;

public class DeploymentRepository : IDeploymentRepository
{
    private readonly IDbConnectionFactory _db;

    public DeploymentRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task CreateAsync(DeploymentRecord record)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT INTO deployments (
                id, target_type, target_id, target_name, trigger_type, triggered_by,
                status, current_step, image_name, old_digest, new_digest,
                duration_ms, error_message, log_output, created_at, completed_at
            ) VALUES (
                @Id, @TargetType, @TargetId, @TargetName, @TriggerType, @TriggeredBy,
                @Status, @CurrentStep, @ImageName, @OldDigest, @NewDigest,
                @DurationMs, @ErrorMessage, @LogOutput, @CreatedAt, @CompletedAt
            )";

        await conn.ExecuteAsync(sql, record);
    }

    public async Task UpdateStepAsync(string id, string step)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            UPDATE deployments
            SET current_step = @step,
                status = CASE WHEN status = 'pending' THEN 'in_progress' ELSE status END
            WHERE id = @id";

        await conn.ExecuteAsync(sql, new { id, step });
    }

    public async Task CompleteAsync(string id, string status, string? newDigest, long durationMs, string? error, string? logOutput)
    {
        using var conn = _db.CreateConnection();
        string completedAt = DateTime.UtcNow.ToString("o");
        var sql = @"
            UPDATE deployments
            SET status = @status,
                current_step = CASE WHEN @status = 'success' THEN 'live' ELSE current_step END,
                new_digest = COALESCE(@newDigest, new_digest),
                duration_ms = @durationMs,
                error_message = @error,
                log_output = @logOutput,
                completed_at = @completedAt
            WHERE id = @id";

        await conn.ExecuteAsync(sql, new { id, status, newDigest, durationMs, error, logOutput, completedAt });
    }

    public async Task<DeploymentRecord?> GetByIdAsync(string id)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT 
                id AS Id,
                target_type AS TargetType,
                target_id AS TargetId,
                target_name AS TargetName,
                trigger_type AS TriggerType,
                triggered_by AS TriggeredBy,
                status AS Status,
                current_step AS CurrentStep,
                image_name AS ImageName,
                old_digest AS OldDigest,
                new_digest AS NewDigest,
                duration_ms AS DurationMs,
                error_message AS ErrorMessage,
                log_output AS LogOutput,
                created_at AS CreatedAt,
                completed_at AS CompletedAt
            FROM deployments
            WHERE id = @id";

        return await conn.QuerySingleOrDefaultAsync<DeploymentRecord>(sql, new { id });
    }

    public async Task<List<DeploymentRecord>> GetRecentDeploymentsAsync(string? targetId = null, int limit = 50)
    {
        using var conn = _db.CreateConnection();
        string sql;
        if (!string.IsNullOrWhiteSpace(targetId))
        {
            sql = @"
                SELECT 
                    id AS Id,
                    target_type AS TargetType,
                    target_id AS TargetId,
                    target_name AS TargetName,
                    trigger_type AS TriggerType,
                    triggered_by AS TriggeredBy,
                    status AS Status,
                    current_step AS CurrentStep,
                    image_name AS ImageName,
                    old_digest AS OldDigest,
                    new_digest AS NewDigest,
                    duration_ms AS DurationMs,
                    error_message AS ErrorMessage,
                    log_output AS LogOutput,
                    created_at AS CreatedAt,
                    completed_at AS CompletedAt
                FROM deployments
                WHERE target_id = @targetId
                ORDER BY created_at DESC
                LIMIT @limit";

            var rows = await conn.QueryAsync<DeploymentRecord>(sql, new { targetId, limit });
            return rows.AsList();
        }
        else
        {
            sql = @"
                SELECT 
                    id AS Id,
                    target_type AS TargetType,
                    target_id AS TargetId,
                    target_name AS TargetName,
                    trigger_type AS TriggerType,
                    triggered_by AS TriggeredBy,
                    status AS Status,
                    current_step AS CurrentStep,
                    image_name AS ImageName,
                    old_digest AS OldDigest,
                    new_digest AS NewDigest,
                    duration_ms AS DurationMs,
                    error_message AS ErrorMessage,
                    log_output AS LogOutput,
                    created_at AS CreatedAt,
                    completed_at AS CompletedAt
                FROM deployments
                ORDER BY created_at DESC
                LIMIT @limit";

            var rows = await conn.QueryAsync<DeploymentRecord>(sql, new { limit });
            return rows.AsList();
        }
    }

    public async Task CleanupStaleDeploymentsAsync()
    {
        using var conn = _db.CreateConnection();
        string completedAt = DateTime.UtcNow.ToString("o");

        // 1. Askıda kalan (pending / in_progress / pulling / recreating / healthcheck) süreçleri sonlandır
        var sqlStale = @"
            UPDATE deployments
            SET status = 'failed',
                current_step = 'failed',
                error_message = 'Sunucu yeniden başlatıldığı veya işlem zaman aşımına uğradığı için yarıda kesildi.',
                completed_at = @completedAt
            WHERE status IN ('pending', 'in_progress', 'pulling', 'recreating', 'healthcheck')";

        await conn.ExecuteAsync(sqlStale, new { completedAt });

        // 2. Corvus self-preservation: Corvus'u hedef alan herhangi bir askıda kalmış veya tamamlanmamış kaydı kapat
        var sqlSelf = @"
            UPDATE deployments
            SET status = 'failed',
                current_step = 'failed',
                error_message = 'Corvus kendi kendini panelden dağıtamaz (Corvus Self-Preservation Guard).',
                completed_at = @completedAt
            WHERE (LOWER(target_name) LIKE '%corvus%' OR LOWER(image_name) LIKE '%corvus%')
              AND status NOT IN ('failed', 'rolled_back')";

        await conn.ExecuteAsync(sqlSelf, new { completedAt });
    }
}
