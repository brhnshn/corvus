using Corvus.Api.Data;
using Corvus.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class MetricsRepositoryTests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;
    private readonly IMetricsRepository _repo;

    public MetricsRepositoryTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_metrics_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        _dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
        _repo = new MetricsRepository(_dbFactory);
    }

    [Fact]
    public async Task Insert_And_GetRecent_WorksForRawMetrics()
    {
        var now = DateTime.UtcNow;
        var metric = new SystemMetric
        {
            RecordedAt = now.ToString("o"),
            CpuPercent = 25.5,
            RamUsedMb = 2048,
            RamTotalMb = 8192,
            DiskUsedGb = 40,
            DiskTotalGb = 100,
            NetworkRxBytes = 1000,
            NetworkTxBytes = 2000
        };

        await _repo.InsertAsync(metric);
        var recent = await _repo.GetRecentAsync("1h");

        Assert.NotEmpty(recent);
        var latest = await _repo.GetLatestAsync();
        Assert.NotNull(latest);
        Assert.Equal(25.5, latest.CpuPercent);
        Assert.Equal(2048, latest.RamUsedMb);
    }

    [Fact]
    public async Task AggregateHourlyMetrics_RollsUpPastHours_AndIsIdempotent()
    {
        // 2 saat öncesine 3 farklı 15 saniyelik metrik ekle
        var twoHoursAgo = DateTime.UtcNow.AddHours(-2);
        string hourPrefix = twoHoursAgo.ToString("yyyy-MM-ddTHH");

        await _repo.InsertAsync(new SystemMetric
        {
            RecordedAt = $"{hourPrefix}:10:00.0000000Z",
            CpuPercent = 20.0,
            RamUsedMb = 2000,
            RamTotalMb = 8000,
            DiskUsedGb = 50,
            DiskTotalGb = 100,
            NetworkRxBytes = 100,
            NetworkTxBytes = 200
        });

        await _repo.InsertAsync(new SystemMetric
        {
            RecordedAt = $"{hourPrefix}:25:00.0000000Z",
            CpuPercent = 40.0,
            RamUsedMb = 4000,
            RamTotalMb = 8000,
            DiskUsedGb = 50,
            DiskTotalGb = 100,
            NetworkRxBytes = 200,
            NetworkTxBytes = 300
        });

        await _repo.InsertAsync(new SystemMetric
        {
            RecordedAt = $"{hourPrefix}:45:00.0000000Z",
            CpuPercent = 60.0,
            RamUsedMb = 6000,
            RamTotalMb = 8000,
            DiskUsedGb = 50,
            DiskTotalGb = 100,
            NetworkRxBytes = 300,
            NetworkTxBytes = 400
        });

        // Agregasyonu çalıştır
        await _repo.AggregateHourlyMetricsAsync();

        // 30 günlük grafikten çek - saatlik özet olarak gelmeli
        var metrics30d = await _repo.GetRecentAsync("30d");
        Assert.NotEmpty(metrics30d);

        var rolledUp = metrics30d.FirstOrDefault(m => m.RecordedAt.StartsWith(hourPrefix));
        Assert.NotNull(rolledUp);
        // Ortalamalar: CPU (20 + 40 + 60) / 3 = 40.0, RAM (2000 + 4000 + 6000) / 3 = 4000
        Assert.Equal(40.0, rolledUp.CpuPercent);
        Assert.Equal(4000, rolledUp.RamUsedMb);
        Assert.Equal(8000, rolledUp.RamTotalMb);

        // İkinci kez çalıştırıldığında (idempotency) hata vermemeli veya mükerrer kayıt oluşturmamalı
        await _repo.AggregateHourlyMetricsAsync();
        var metricsAfterSecondRun = await _repo.GetRecentAsync("30d");
        var countForHour = metricsAfterSecondRun.Count(m => m.RecordedAt.StartsWith(hourPrefix));
        Assert.Equal(1, countForHour);
    }

    [Fact]
    public async Task CleanupOldRawMetrics_DeletesRecordsOlderThan7Days()
    {
        var oldDate = DateTime.UtcNow.AddDays(-10).ToString("o");
        var recentDate = DateTime.UtcNow.AddDays(-2).ToString("o");

        await _repo.InsertAsync(new SystemMetric
        {
            RecordedAt = oldDate,
            CpuPercent = 10.0,
            RamUsedMb = 1024,
            RamTotalMb = 4096,
            DiskUsedGb = 20,
            DiskTotalGb = 100,
            NetworkRxBytes = 0,
            NetworkTxBytes = 0
        });

        await _repo.InsertAsync(new SystemMetric
        {
            RecordedAt = recentDate,
            CpuPercent = 15.0,
            RamUsedMb = 1024,
            RamTotalMb = 4096,
            DiskUsedGb = 20,
            DiskTotalGb = 100,
            NetworkRxBytes = 0,
            NetworkTxBytes = 0
        });

        // 7 günden eski ham metrikleri temizle
        await _repo.CleanupOldRawMetricsAsync(7);

        using var conn = _dbFactory.CreateConnection();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM system_metrics";
        long count = Convert.ToInt64(cmd.ExecuteScalar());

        // Sadece 2 gün önceki kayıt kalmalı, 10 gün önceki silinmiş olmalı
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task CleanupOldHourlyMetrics_DeletesRecordsOlderThan365Days()
    {
        using (var conn = _dbFactory.CreateConnection())
        {
            using var cmd = conn.CreateCommand();
            // 400 gün öncesine ve 30 gün öncesine saatlik özet ekle
            var oldHour = DateTime.UtcNow.AddDays(-400).ToString("yyyy-MM-ddTHH:00:00Z");
            var recentHour = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-ddTHH:00:00Z");

            cmd.CommandText = $@"
                INSERT INTO system_metrics_hourly (recorded_at, cpu_percent, ram_used_mb, ram_total_mb, disk_used_gb, disk_total_gb, network_rx_bytes, network_tx_bytes)
                VALUES 
                ('{oldHour}', 10, 1000, 4000, 20, 100, 0, 0),
                ('{recentHour}', 20, 2000, 4000, 20, 100, 0, 0)";
            cmd.ExecuteNonQuery();
        }

        await _repo.CleanupOldHourlyMetricsAsync(365);

        using (var conn = _dbFactory.CreateConnection())
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM system_metrics_hourly";
            long count = Convert.ToInt64(cmd.ExecuteScalar());

            // 400 gün önceki silinmeli, 30 gün önceki kalmalı
            Assert.Equal(1, count);
        }
    }

    [Fact]
    public async Task GetRecentAsync_Supports30d_90d_And1y_Downsampling()
    {
        var now = DateTime.UtcNow;

        // Geçmiş 5 saate metrik ekle
        for (int i = 1; i <= 5; i++)
        {
            var dt = now.AddHours(-i);
            await _repo.InsertAsync(new SystemMetric
            {
                RecordedAt = dt.ToString("o"),
                CpuPercent = 10.0 * i,
                RamUsedMb = 1000 * i,
                RamTotalMb = 8000,
                DiskUsedGb = 30,
                DiskTotalGb = 100,
                NetworkRxBytes = 100,
                NetworkTxBytes = 100
            });
        }

        var res30d = await _repo.GetRecentAsync("30d");
        var res90d = await _repo.GetRecentAsync("90d");
        var res1y = await _repo.GetRecentAsync("1y");

        Assert.NotEmpty(res30d);
        Assert.NotEmpty(res90d);
        Assert.NotEmpty(res1y);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempDbDir))
            {
                Directory.Delete(_tempDbDir, recursive: true);
            }
        }
        catch { }
    }
}
