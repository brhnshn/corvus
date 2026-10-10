using Dapper;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

public interface IAlertRuleRepository
{
    Task<IEnumerable<AlertRule>> GetAllRulesAsync();
    Task<AlertRule?> GetRuleByIdAsync(string id);
    Task<IEnumerable<AlertRule>> GetEnabledRulesAsync();
    Task CreateRuleAsync(AlertRule rule);
    Task UpdateRuleAsync(AlertRule rule);
    Task UpdateRuleStateAsync(string id, bool isFiring, DateTime? violationStartAt, DateTime? lastTriggeredAt);
    Task DeleteRuleAsync(string id);
}

public class AlertRuleRepository : IAlertRuleRepository
{
    private readonly IDbConnectionFactory _db;

    public AlertRuleRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public record AlertRuleDbRow(
        string id,
        string name,
        string target_type,
        string? target_id,
        string metric,
        string operator_str,
        double threshold_value,
        int duration_seconds,
        int cooldown_minutes,
        int is_enabled,
        int is_firing,
        string? violation_start_at,
        string? last_triggered_at,
        string created_at,
        string updated_at);

    private static AlertRule MapToModel(AlertRuleDbRow r)
    {
        return new AlertRule
        {
            Id = r.id,
            Name = r.name,
            TargetType = r.target_type,
            TargetId = r.target_id,
            Metric = r.metric,
            Operator = r.operator_str,
            ThresholdValue = r.threshold_value,
            DurationSeconds = r.duration_seconds,
            CooldownMinutes = r.cooldown_minutes,
            IsEnabled = r.is_enabled == 1,
            IsFiring = r.is_firing == 1,
            ViolationStartAt = !string.IsNullOrEmpty(r.violation_start_at) && DateTime.TryParse(r.violation_start_at, out var vs) ? vs : null,
            LastTriggeredAt = !string.IsNullOrEmpty(r.last_triggered_at) && DateTime.TryParse(r.last_triggered_at, out var lt) ? lt : null,
            CreatedAt = DateTime.TryParse(r.created_at, out var ca) ? ca : DateTime.UtcNow,
            UpdatedAt = DateTime.TryParse(r.updated_at, out var ua) ? ua : DateTime.UtcNow
        };
    }

    public async Task<IEnumerable<AlertRule>> GetAllRulesAsync()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT id, name, target_type, target_id, metric, operator AS operator_str, threshold_value, duration_seconds, cooldown_minutes, is_enabled, is_firing, violation_start_at, last_triggered_at, created_at, updated_at FROM alert_rules ORDER BY created_at DESC;";
        var rows = await conn.QueryAsync<AlertRuleDbRow>(sql);
        return rows.Select(MapToModel);
    }

    public async Task<AlertRule?> GetRuleByIdAsync(string id)
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT id, name, target_type, target_id, metric, operator AS operator_str, threshold_value, duration_seconds, cooldown_minutes, is_enabled, is_firing, violation_start_at, last_triggered_at, created_at, updated_at FROM alert_rules WHERE id = @Id LIMIT 1;";
        var row = await conn.QueryFirstOrDefaultAsync<AlertRuleDbRow>(sql, new { Id = id });
        return row != null ? MapToModel(row) : null;
    }

    public async Task<IEnumerable<AlertRule>> GetEnabledRulesAsync()
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT id, name, target_type, target_id, metric, operator AS operator_str, threshold_value, duration_seconds, cooldown_minutes, is_enabled, is_firing, violation_start_at, last_triggered_at, created_at, updated_at FROM alert_rules WHERE is_enabled = 1;";
        var rows = await conn.QueryAsync<AlertRuleDbRow>(sql);
        return rows.Select(MapToModel);
    }

    public async Task CreateRuleAsync(AlertRule rule)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            INSERT INTO alert_rules (
                id, name, target_type, target_id, metric, operator, 
                threshold_value, duration_seconds, cooldown_minutes, 
                is_enabled, is_firing, violation_start_at, last_triggered_at, 
                created_at, updated_at
            ) VALUES (
                @Id, @Name, @TargetType, @TargetId, @Metric, @Operator,
                @ThresholdValue, @DurationSeconds, @CooldownMinutes,
                @IsEnabled, @IsFiring, @ViolationStartAt, @LastTriggeredAt,
                @CreatedAt, @UpdatedAt
            );";

        await conn.ExecuteAsync(sql, new
        {
            rule.Id,
            rule.Name,
            rule.TargetType,
            rule.TargetId,
            rule.Metric,
            rule.Operator,
            rule.ThresholdValue,
            rule.DurationSeconds,
            rule.CooldownMinutes,
            IsEnabled = rule.IsEnabled ? 1 : 0,
            IsFiring = rule.IsFiring ? 1 : 0,
            ViolationStartAt = rule.ViolationStartAt?.ToString("o"),
            LastTriggeredAt = rule.LastTriggeredAt?.ToString("o"),
            CreatedAt = rule.CreatedAt.ToString("o"),
            UpdatedAt = rule.UpdatedAt.ToString("o")
        });
    }

    public async Task UpdateRuleAsync(AlertRule rule)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE alert_rules SET
                name = @Name,
                target_type = @TargetType,
                target_id = @TargetId,
                metric = @Metric,
                operator = @Operator,
                threshold_value = @ThresholdValue,
                duration_seconds = @DurationSeconds,
                cooldown_minutes = @CooldownMinutes,
                is_enabled = @IsEnabled,
                updated_at = @UpdatedAt
            WHERE id = @Id;";

        await conn.ExecuteAsync(sql, new
        {
            rule.Id,
            rule.Name,
            rule.TargetType,
            rule.TargetId,
            rule.Metric,
            rule.Operator,
            rule.ThresholdValue,
            rule.DurationSeconds,
            rule.CooldownMinutes,
            IsEnabled = rule.IsEnabled ? 1 : 0,
            UpdatedAt = DateTime.UtcNow.ToString("o")
        });
    }

    public async Task UpdateRuleStateAsync(string id, bool isFiring, DateTime? violationStartAt, DateTime? lastTriggeredAt)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            UPDATE alert_rules SET
                is_firing = @IsFiring,
                violation_start_at = @ViolationStartAt,
                last_triggered_at = @LastTriggeredAt,
                updated_at = @UpdatedAt
            WHERE id = @Id;";

        await conn.ExecuteAsync(sql, new
        {
            Id = id,
            IsFiring = isFiring ? 1 : 0,
            ViolationStartAt = violationStartAt?.ToString("o"),
            LastTriggeredAt = lastTriggeredAt?.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        });
    }

    public async Task DeleteRuleAsync(string id)
    {
        using var conn = _db.CreateConnection();
        const string sql = "DELETE FROM alert_rules WHERE id = @Id;";
        await conn.ExecuteAsync(sql, new { Id = id });
    }
}
