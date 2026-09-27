using Dapper;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

public interface IUptimeRepository
{
    Task InsertAsync(UptimeCheck check);
    Task<List<UptimeCheck>> GetByServiceAsync(string serviceId, string range = "7d");
    Task<Dictionary<string, double>> Get24hUptimePercentagesAsync();
    Task<Dictionary<string, List<UptimeCheck>>> GetRecentChecksForServicesAsync(IEnumerable<string> serviceIds, int count = 30);
    Task CleanupOldAsync(int retentionDays);
    Task AggregateDailyStatsAsync();
    Task<List<DailyUptimeStat>> GetDailyStatsAsync(string serviceId, int days = 30);
}

public class UptimeRepository : IUptimeRepository
{
    private readonly IDbConnectionFactory _db;
    private static (DateTime Expiry, Dictionary<string, double>? Dict) _uptimeCache;
    private static readonly object _cacheLock = new();

    public UptimeRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task InsertAsync(UptimeCheck check)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT INTO uptime_checks (service_id, checked_at, status, response_time_ms, error_message, is_transition)
            VALUES (@ServiceId, @CheckedAt, @Status, @ResponseTimeMs, @ErrorMessage, @IsTransition)";

        await conn.ExecuteAsync(sql, check);
    }

    public async Task<List<UptimeCheck>> GetByServiceAsync(string serviceId, string range = "7d")
    {
        int days = range switch
        {
            "24h" => 1,
            "7d" => 7,
            "30d" => 30,
            _ => 7
        };

        string cutoff = DateTime.UtcNow.AddDays(-days).ToString("o");

        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id AS Id, service_id AS ServiceId, checked_at AS CheckedAt, 
                   status AS Status, response_time_ms AS ResponseTimeMs, error_message AS ErrorMessage,
                   is_transition AS IsTransition
            FROM uptime_checks
            WHERE service_id = @serviceId AND checked_at >= @cutoff
            ORDER BY checked_at ASC";

        var rows = await conn.QueryAsync<UptimeCheck>(sql, new { serviceId, cutoff });
        return rows.AsList();
    }

    public async Task<Dictionary<string, double>> Get24hUptimePercentagesAsync()
    {
        var now = DateTime.UtcNow;
        lock (_cacheLock)
        {
            if (_uptimeCache.Dict != null && now < _uptimeCache.Expiry)
            {
                return _uptimeCache.Dict;
            }
        }

        string cutoff = now.AddHours(-24).ToString("o");
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT service_id AS ServiceId, 
                   COUNT(*) AS TotalCount, 
                   SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS UpCount
            FROM uptime_checks
            WHERE checked_at >= @cutoff
            GROUP BY service_id";

        var rows = await conn.QueryAsync<ServiceUptimeAggRow>(sql, new { cutoff });
        var dict = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in rows)
        {
            double pct = r.TotalCount > 0 
                ? Math.Round((double)r.UpCount / r.TotalCount * 100.0, 1) 
                : 100.0;
            dict[r.ServiceId] = pct;
        }

        lock (_cacheLock)
        {
            _uptimeCache = (DateTime.UtcNow.AddSeconds(5), dict);
        }

        return dict;
    }

    public async Task<Dictionary<string, List<UptimeCheck>>> GetRecentChecksForServicesAsync(IEnumerable<string> serviceIds, int count = 30)
    {
        var idList = serviceIds?.Distinct().ToList();
        if (idList == null || idList.Count == 0)
        {
            return new Dictionary<string, List<UptimeCheck>>(StringComparer.OrdinalIgnoreCase);
        }

        using var conn = _db.CreateConnection();
        var sql = @"
            WITH RankedChecks AS (
                SELECT id AS Id, service_id AS ServiceId, checked_at AS CheckedAt, 
                       status AS Status, response_time_ms AS ResponseTimeMs, error_message AS ErrorMessage,
                       is_transition AS IsTransition,
                       ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY checked_at DESC) AS rn
                FROM uptime_checks
                WHERE service_id IN @idList
            )
            SELECT Id, ServiceId, CheckedAt, Status, ResponseTimeMs, ErrorMessage, IsTransition
            FROM RankedChecks
            WHERE rn <= @count
            ORDER BY CheckedAt ASC";

        var rows = await conn.QueryAsync<UptimeCheck>(sql, new { idList, count });
        var dict = new Dictionary<string, List<UptimeCheck>>(StringComparer.OrdinalIgnoreCase);
        foreach (var id in idList)
        {
            dict[id] = new List<UptimeCheck>();
        }

        foreach (var check in rows)
        {
            if (dict.TryGetValue(check.ServiceId, out var list))
            {
                list.Add(check);
            }
            else
            {
                dict[check.ServiceId] = new List<UptimeCheck> { check };
            }
        }

        return dict;
    }

    public async Task AggregateDailyStatsAsync()
    {
        string today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT OR REPLACE INTO uptime_daily_stats (service_id, date, total_checks, up_checks, avg_response_time_ms)
            SELECT 
                c.service_id,
                substr(c.checked_at, 1, 10) AS date,
                COUNT(*) AS total_checks,
                SUM(CASE WHEN c.status = 'up' THEN 1 ELSE 0 END) AS up_checks,
                CAST(ROUND(AVG(c.response_time_ms)) AS INTEGER) AS avg_response_time_ms
            FROM uptime_checks c
            WHERE substr(c.checked_at, 1, 10) < @today
              AND NOT EXISTS (
                  SELECT 1 FROM uptime_daily_stats s
                  WHERE s.service_id = c.service_id AND s.date = substr(c.checked_at, 1, 10)
              )
            GROUP BY c.service_id, substr(c.checked_at, 1, 10)";

        await conn.ExecuteAsync(sql, new { today });
    }

    public async Task<List<DailyUptimeStat>> GetDailyStatsAsync(string serviceId, int days = 30)
    {
        int effectiveDays = days > 0 ? days : 30;
        string cutoffDate = DateTime.UtcNow.AddDays(-effectiveDays).ToString("yyyy-MM-dd");

        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT service_id AS ServiceId, 
                   date AS Date, 
                   total_checks AS TotalChecks, 
                   up_checks AS UpChecks, 
                   avg_response_time_ms AS AvgResponseTimeMs
            FROM uptime_daily_stats
            WHERE service_id = @serviceId AND date >= @cutoffDate
            ORDER BY date ASC";

        var rows = await conn.QueryAsync<DailyUptimeStat>(sql, new { serviceId, cutoffDate });
        return rows.AsList();
    }

    public async Task CleanupOldAsync(int retentionDays)
    {
        using var conn = _db.CreateConnection();

        // 1. 24 saatten eski ve is_transition = 0 (durum değişimi olmayan önemsiz kontroller) kayıtları sil
        string cutoff24h = DateTime.UtcNow.AddHours(-24).ToString("o");
        await conn.ExecuteAsync(
            "DELETE FROM uptime_checks WHERE checked_at < @cutoff24h AND is_transition = 0",
            new { cutoff24h });

        // 2. retentionDays > 0 ise belirlenen günden eski tüm kayıtları sil
        if (retentionDays > 0)
        {
            string cutoffRetention = DateTime.UtcNow.AddDays(-retentionDays).ToString("o");
            await conn.ExecuteAsync(
                "DELETE FROM uptime_checks WHERE checked_at < @cutoffRetention",
                new { cutoffRetention });
        }

        // 3. 365 günden eski uptime_daily_stats kayıtlarını sil
        string cutoffDaily = DateTime.UtcNow.AddDays(-365).ToString("yyyy-MM-dd");
        await conn.ExecuteAsync(
            "DELETE FROM uptime_daily_stats WHERE date < @cutoffDaily",
            new { cutoffDaily });
    }
}

public record ServiceUptimeAggRow(string ServiceId, int TotalCount, int UpCount);
