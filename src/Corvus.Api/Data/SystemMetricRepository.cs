using Dapper;
using Corvus.Api.Models.Systems;

namespace Corvus.Api.Data;

public class SystemMetricRepository : ISystemMetricRepository
{
    private readonly IDbConnectionFactory _db;

    public SystemMetricRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<int> Insert1mBatchAsync(IReadOnlyList<SystemMetric1mEntity> metrics)
    {
        if (metrics.Count == 0) return 0;

        using var conn = _db.CreateConnection();
        var sql = @"
            INSERT INTO system_metrics_1m (
                system_id, recorded_at, cpu_percent, cpu_cores, 
                ram_used_bytes, ram_total_bytes, disk_used_bytes, disk_total_bytes, 
                network_rx_bytes_sec, network_tx_bytes_sec, load_avg_1m, load_avg_5m, load_avg_15m
            ) VALUES (
                @SystemId, @RecordedAt, @CpuPercent, @CpuCores, 
                @RamUsedBytes, @RamTotalBytes, @DiskUsedBytes, @DiskTotalBytes, 
                @NetworkRxBytesSec, @NetworkTxBytesSec, @LoadAvg1m, @LoadAvg5m, @LoadAvg15m
            )";

        return await conn.ExecuteAsync(sql, metrics);
    }

    public async Task<List<SystemMetric1mEntity>> Get1mHistoryAsync(string systemId, string sinceUtc, int limit = 1440)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, system_id AS SystemId, recorded_at AS RecordedAt, cpu_percent AS CpuPercent, cpu_cores AS CpuCores,
                   ram_used_bytes AS RamUsedBytes, ram_total_bytes AS RamTotalBytes,
                   disk_used_bytes AS DiskUsedBytes, disk_total_bytes AS DiskTotalBytes,
                   network_rx_bytes_sec AS NetworkRxBytesSec, network_tx_bytes_sec AS NetworkTxBytesSec,
                   load_avg_1m AS LoadAvg1m, load_avg_5m AS LoadAvg5m, load_avg_15m AS LoadAvg15m
            FROM system_metrics_1m
            WHERE system_id = @SystemId AND recorded_at >= @SinceUtc
            ORDER BY recorded_at ASC
            LIMIT @Limit";

        var result = await conn.QueryAsync<SystemMetric1mEntity>(sql, new { SystemId = systemId, SinceUtc = sinceUtc, Limit = limit });
        return result.AsList();
    }

    public async Task<int> AggregateAndPruneRollingMetricsAsync(int retention1mDays = 7, int retention1hDays = 30)
    {
        using var conn = _db.CreateConnection();
        string cutoff1m = DateTime.UtcNow.AddDays(-retention1mDays).ToString("o");
        string cutoff1h = DateTime.UtcNow.AddDays(-retention1hDays).ToString("o");

        // 1. 7 gunden eski 1m verilerini 1h tablosuna saatlik gruplama ile tasi
        var rollupSql = @"
            INSERT INTO system_metrics_1h (system_id, recorded_at, cpu_avg, cpu_max, ram_used_avg, disk_used_avg, network_rx_total, network_tx_total)
            SELECT 
                system_id,
                strftime('%Y-%m-%dT%H:00:00Z', recorded_at) AS recorded_at,
                ROUND(AVG(cpu_percent), 2) AS cpu_avg,
                ROUND(MAX(cpu_percent), 2) AS cpu_max,
                CAST(AVG(ram_used_bytes) AS INTEGER) AS ram_used_avg,
                CAST(AVG(disk_used_bytes) AS INTEGER) AS disk_used_avg,
                SUM(network_rx_bytes_sec) AS network_rx_total,
                SUM(network_tx_bytes_sec) AS network_tx_total
            FROM system_metrics_1m
            WHERE recorded_at < @Cutoff1m
            GROUP BY system_id, strftime('%Y-%m-%dT%H:00:00Z', recorded_at);";

        await conn.ExecuteAsync(rollupSql, new { Cutoff1m = cutoff1m });

        // 2. 1m tablosundan eski verileri sil
        var delete1mSql = "DELETE FROM system_metrics_1m WHERE recorded_at < @Cutoff1m;";
        int deleted1m = await conn.ExecuteAsync(delete1mSql, new { Cutoff1m = cutoff1m });

        // 3. 1h tablosundan 30 gunden eski verileri sil
        var delete1hSql = "DELETE FROM system_metrics_1h WHERE recorded_at < @Cutoff1h;";
        int deleted1h = await conn.ExecuteAsync(delete1hSql, new { Cutoff1h = cutoff1h });

        return deleted1m + deleted1h;
    }

    public async Task<List<SystemMetric1hEntity>> Get1hHistoryAsync(string systemId, string sinceUtc, int limit = 720)
    {
        using var conn = _db.CreateConnection();
        var sql = @"
            SELECT id, system_id AS SystemId, recorded_at AS RecordedAt,
                   cpu_avg AS CpuAvg, cpu_max AS CpuMax,
                   ram_used_avg AS RamUsedAvg, disk_used_avg AS DiskUsedAvg,
                   network_rx_total AS NetworkRxTotal, network_tx_total AS NetworkTxTotal
            FROM system_metrics_1h
            WHERE system_id = @SystemId AND recorded_at >= @SinceUtc
            ORDER BY recorded_at ASC
            LIMIT @Limit";

        var result = await conn.QueryAsync<SystemMetric1hEntity>(sql, new { SystemId = systemId, SinceUtc = sinceUtc, Limit = limit });
        return result.AsList();
    }
}
