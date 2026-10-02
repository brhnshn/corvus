using Dapper;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

public interface IMetricsRepository
{
    Task InsertAsync(SystemMetric metric);
    Task<List<SystemMetric>> GetRecentAsync(string range = "24h");
    Task<SystemMetric?> GetLatestAsync();
    Task CleanupOldAsync(int retentionDays);
    Task AggregateHourlyMetricsAsync();
    Task CleanupOldRawMetricsAsync(int rawDays = 7);
    Task CleanupOldHourlyMetricsAsync(int hourlyRetentionDays = 365);
}

public class MetricsRepository : IMetricsRepository
{
    private readonly IDbConnectionFactory _db;

    public MetricsRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task InsertAsync(SystemMetric metric)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT INTO system_metrics (recorded_at, cpu_percent, ram_used_mb, ram_total_mb, disk_used_gb, disk_total_gb, network_rx_bytes, network_tx_bytes)
            VALUES (@RecordedAt, @CpuPercent, @RamUsedMb, @RamTotalMb, @DiskUsedGb, @DiskTotalGb, @NetworkRxBytes, @NetworkTxBytes)";

        await conn.ExecuteAsync(sql, metric);
    }

    public async Task<List<SystemMetric>> GetRecentAsync(string range = "24h")
    {
        // Uzun vadeli aralıklar (30d, 90d, 1y) için saatlik seyreltilmiş (rollup) tablodan oku
        if (range is "30d" or "90d" or "1y" or "365d")
        {
            int days = range switch
            {
                "90d" => 90,
                "1y" or "365d" => 365,
                _ => 30
            };
            int stepHours = range switch
            {
                "90d" => 6,
                "1y" or "365d" => 24,
                _ => 2 // 30d: her 2 saatte bir (~360 nokta)
            };

            string cutoff = DateTime.UtcNow.AddDays(-days).ToString("o");

            using var conn = _db.CreateConnection();
            var sql = @"
                WITH combined AS (
                    SELECT id AS Id, recorded_at AS RecordedAt, cpu_percent AS CpuPercent, 
                           CAST(ram_used_mb AS INTEGER) AS RamUsedMb, CAST(ram_total_mb AS INTEGER) AS RamTotalMb, 
                           CAST(disk_used_gb AS INTEGER) AS DiskUsedGb, CAST(disk_total_gb AS INTEGER) AS DiskTotalGb, 
                           network_rx_bytes AS NetworkRxBytes, network_tx_bytes AS NetworkTxBytes
                    FROM system_metrics_hourly
                    WHERE recorded_at >= @cutoff
                    UNION ALL
                    SELECT 0 AS Id,
                           substr(recorded_at, 1, 13) || ':00:00Z' AS RecordedAt,
                           ROUND(AVG(cpu_percent), 2) AS CpuPercent,
                           CAST(ROUND(AVG(ram_used_mb)) AS INTEGER) AS RamUsedMb,
                           CAST(MAX(ram_total_mb) AS INTEGER) AS RamTotalMb,
                           CAST(ROUND(AVG(disk_used_gb)) AS INTEGER) AS DiskUsedGb,
                           CAST(MAX(disk_total_gb) AS INTEGER) AS DiskTotalGb,
                           CAST(AVG(network_rx_bytes) AS INTEGER) AS NetworkRxBytes,
                           CAST(AVG(network_tx_bytes) AS INTEGER) AS NetworkTxBytes
                    FROM system_metrics
                    WHERE recorded_at >= @cutoff
                      AND (substr(recorded_at, 1, 13) || ':00:00Z') NOT IN (
                          SELECT recorded_at FROM system_metrics_hourly WHERE recorded_at >= @cutoff
                      )
                    GROUP BY substr(recorded_at, 1, 13)
                ),
                ranked AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY RecordedAt ASC) AS row_num
                    FROM combined
                )
                SELECT Id, RecordedAt, CpuPercent, RamUsedMb, RamTotalMb, DiskUsedGb, DiskTotalGb, NetworkRxBytes, NetworkTxBytes
                FROM ranked
                WHERE (row_num - 1) % @stepHours = 0
                ORDER BY RecordedAt ASC";

            var rows = await conn.QueryAsync<SystemMetric>(sql, new { cutoff, stepHours });
            return rows.AsList();
        }

        int hours;
        int step;

        switch (range)
        {
            case "1h":
                hours = 1;
                step = 1; // Tüm noktalar (~240 nokta)
                break;
            case "6h":
                hours = 6;
                step = 4; // her 1 dakikada 1 nokta (~360 nokta)
                break;
            case "12h":
                hours = 12;
                step = 10; // her 2.5 dakikada 1 nokta (~288 nokta)
                break;
            case "24h":
                hours = 24;
                step = 20; // her 5 dakikada 1 nokta (~288 nokta)
                break;
            case "7d":
                hours = 24 * 7;
                step = 120; // her 30 dakikada 1 nokta (~336 nokta)
                break;
            default:
                hours = 24;
                step = 20;
                break;
        }

        string cutoffRaw = DateTime.UtcNow.AddHours(-hours).ToString("o");

        using var connRaw = _db.CreateConnection();
        var sqlRaw = @"
            SELECT id AS Id, recorded_at AS RecordedAt, cpu_percent AS CpuPercent, 
                   ram_used_mb AS RamUsedMb, ram_total_mb AS RamTotalMb, 
                   disk_used_gb AS DiskUsedGb, disk_total_gb AS DiskTotalGb, 
                   network_rx_bytes AS NetworkRxBytes, network_tx_bytes AS NetworkTxBytes
            FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY id ASC) AS row_num
                FROM system_metrics
                WHERE recorded_at >= @cutoffRaw
            )
            WHERE (row_num - 1) % @step = 0
            ORDER BY id ASC";

        var rawRows = await connRaw.QueryAsync<SystemMetric>(sqlRaw, new { cutoffRaw = cutoffRaw, step });
        return rawRows.AsList();
    }

    public async Task<SystemMetric?> GetLatestAsync()
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id AS Id, recorded_at AS RecordedAt, cpu_percent AS CpuPercent, 
                   ram_used_mb AS RamUsedMb, ram_total_mb AS RamTotalMb, 
                   disk_used_gb AS DiskUsedGb, disk_total_gb AS DiskTotalGb, 
                   network_rx_bytes AS NetworkRxBytes, network_tx_bytes AS NetworkTxBytes
            FROM system_metrics
            ORDER BY id DESC
            LIMIT 1";

        return await conn.QuerySingleOrDefaultAsync<SystemMetric>(sql);
    }

    public async Task AggregateHourlyMetricsAsync()
    {
        string currentHour = DateTime.UtcNow.ToString("yyyy-MM-ddTHH");
        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT OR REPLACE INTO system_metrics_hourly (
                recorded_at, cpu_percent, ram_used_mb, ram_total_mb, 
                disk_used_gb, disk_total_gb, network_rx_bytes, network_tx_bytes
            )
            SELECT 
                substr(m.recorded_at, 1, 13) || ':00:00Z' AS recorded_at,
                ROUND(AVG(m.cpu_percent), 2) AS cpu_percent,
                ROUND(AVG(m.ram_used_mb), 2) AS ram_used_mb,
                MAX(m.ram_total_mb) AS ram_total_mb,
                ROUND(AVG(m.disk_used_gb), 2) AS disk_used_gb,
                MAX(m.disk_total_gb) AS disk_total_gb,
                CAST(AVG(m.network_rx_bytes) AS INTEGER) AS network_rx_bytes,
                CAST(AVG(m.network_tx_bytes) AS INTEGER) AS network_tx_bytes
            FROM system_metrics m
            WHERE substr(m.recorded_at, 1, 13) < @currentHour
              AND NOT EXISTS (
                  SELECT 1 FROM system_metrics_hourly h 
                  WHERE h.recorded_at = (substr(m.recorded_at, 1, 13) || ':00:00Z')
              )
            GROUP BY substr(m.recorded_at, 1, 13)";

        await conn.ExecuteAsync(sql, new { currentHour });
    }

    public async Task CleanupOldRawMetricsAsync(int rawDays = 7)
    {
        if (rawDays <= 0) return;
        string cutoff = DateTime.UtcNow.AddDays(-rawDays).ToString("o");
        using var conn = _db.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM system_metrics WHERE recorded_at < @cutoff", new { cutoff });
    }

    public async Task CleanupOldHourlyMetricsAsync(int hourlyRetentionDays = 365)
    {
        if (hourlyRetentionDays <= 0) return;
        string cutoff = DateTime.UtcNow.AddDays(-hourlyRetentionDays).ToString("o");
        using var conn = _db.CreateConnection();
        await conn.ExecuteAsync("DELETE FROM system_metrics_hourly WHERE recorded_at < @cutoff", new { cutoff });
    }

    public async Task CleanupOldAsync(int retentionDays)
    {
        if (retentionDays <= 0) return;
        await AggregateHourlyMetricsAsync();
        await CleanupOldRawMetricsAsync(7);
        await CleanupOldHourlyMetricsAsync(Math.Max(retentionDays, 365));
    }
}
