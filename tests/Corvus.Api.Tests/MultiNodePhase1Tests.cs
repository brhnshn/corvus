using Corvus.Api.Data;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services.Systems;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class MultiNodePhase1Tests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;

    public MultiNodePhase1Tests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_systems_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        _dbFactory = new DbConnectionFactory(config);

        // Run migrations (including 016_systems_sqlite.sql)
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
    }

    [Fact]
    public void TelemetryRingBuffer_Preserves_Max_60_Points_And_Retrieves_Latest()
    {
        var buffer = new TelemetryRingBuffer();
        string systemId = "sys-node-01";

        // Push 70 points
        for (int i = 1; i <= 70; i++)
        {
            var point = new SystemTelemetryPoint(
                timestampUnixSeconds: 1000 + i,
                cpuPercent: i,
                cpuCores: 4,
                ramUsedBytes: i * 1024L * 1024L,
                ramTotalBytes: 16L * 1024L * 1024L * 1024L,
                diskUsedBytes: 50L * 1024L * 1024L * 1024L,
                diskTotalBytes: 100L * 1024L * 1024L * 1024L,
                netRxBytesSec: 500,
                netTxBytesSec: 200,
                loadAvg1m: 0.5f,
                loadAvg5m: 0.4f,
                loadAvg15m: 0.3f
            );
            buffer.Push(systemId, in point);
        }

        // Test TryGetLatest
        bool hasLatest = buffer.TryGetLatest(systemId, out var latest);
        Assert.True(hasLatest);
        Assert.Equal(70, latest.CpuPercent);

        // Test RecentPoints (Max 60 points)
        var recent = buffer.GetRecentPoints(systemId, 100);
        Assert.Equal(60, recent.Count);
        Assert.Equal(11, recent[0].CpuPercent); // The oldest kept is point 11
        Assert.Equal(70, recent[^1].CpuPercent); // The newest is point 70

        // Test Memory estimation
        long estimatedMemory = buffer.EstimateMemoryBytes();
        Assert.True(estimatedMemory > 0);
        Assert.True(estimatedMemory <= 16384); // 1 node < 16 KB

        // Test DrainForBatchFlush
        var drain = buffer.DrainForBatchFlush();
        Assert.True(drain.ContainsKey(systemId));
        Assert.Equal(60, drain[systemId].Length);
    }

    [Fact]
    public async Task SystemRepository_And_Tokens_Work_EndToEnd()
    {
        var repo = new SystemRepository(_dbFactory);
        string systemId = "sys-test-" + Guid.NewGuid().ToString("N")[..8];

        var system = new SystemEntity
        {
            Id = systemId,
            Name = "Frankfurt Edge 01",
            Hostname = "fra-edge-01",
            IpAddress = "192.168.1.100",
            OsInfo = "Linux x86_64",
            AgentVersion = "1.0.0",
            TagsJson = "[\"prod\",\"edge\"]",
            Status = "online",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o"),
            LastSeenAt = DateTime.UtcNow.ToString("o")
        };

        // 1. Create
        int created = await repo.CreateAsync(system);
        Assert.Equal(1, created);

        // 2. GetById
        var fetched = await repo.GetByIdAsync(systemId);
        Assert.NotNull(fetched);
        Assert.Equal("Frankfurt Edge 01", fetched.Name);
        Assert.Equal("online", fetched.Status);

        // 3. Update status
        string updatedLastSeen = DateTime.UtcNow.AddMinutes(1).ToString("o");
        await repo.UpdateStatusAsync(systemId, "degraded", updatedLastSeen);
        var updated = await repo.GetByIdAsync(systemId);
        Assert.NotNull(updated);
        Assert.Equal("degraded", updated.Status);

        // 4. Token handling
        var token = new SystemTokenEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            SystemId = systemId,
            TokenHash = "abc123hash" + Guid.NewGuid().ToString("N"),
            TokenPrefix = "crv_live_test",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            IsRevoked = 0
        };
        await repo.UpsertTokenAsync(token);

        var tokenFetched = await repo.GetTokenByHashAsync(token.TokenHash);
        Assert.NotNull(tokenFetched);
        Assert.Equal(0, tokenFetched.IsRevoked);

        // 5. Revoke token
        await repo.RevokeTokenAsync(systemId);
        var revokedToken = await repo.GetTokenByHashAsync(token.TokenHash);
        Assert.NotNull(revokedToken);
        Assert.Equal(1, revokedToken.IsRevoked);

        // 6. Delete
        await repo.DeleteAsync(systemId);
        var deleted = await repo.GetByIdAsync(systemId);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task SystemMetricRepository_BatchInsert_And_RollingPrune_Work()
    {
        var sysRepo = new SystemRepository(_dbFactory);
        string systemId = "sys-metric-" + Guid.NewGuid().ToString("N")[..8];
        await sysRepo.CreateAsync(new SystemEntity
        {
            Id = systemId,
            Name = "Metric Test System",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        });

        var repo = new SystemMetricRepository(_dbFactory);

        var metrics = new List<SystemMetric1mEntity>
        {
            new SystemMetric1mEntity
            {
                SystemId = systemId,
                RecordedAt = DateTime.UtcNow.AddDays(-10).ToString("o"), // 10 days old (should be rolled up & pruned)
                CpuPercent = 45.5,
                CpuCores = 4,
                RamUsedBytes = 2L * 1024 * 1024 * 1024,
                RamTotalBytes = 8L * 1024 * 1024 * 1024,
                DiskUsedBytes = 20L * 1024 * 1024 * 1024,
                DiskTotalBytes = 100L * 1024 * 1024 * 1024,
                NetworkRxBytesSec = 1000,
                NetworkTxBytesSec = 2000,
                LoadAvg1m = 1.2,
                LoadAvg5m = 1.0,
                LoadAvg15m = 0.8
            },
            new SystemMetric1mEntity
            {
                SystemId = systemId,
                RecordedAt = DateTime.UtcNow.AddMinutes(-5).ToString("o"), // recent
                CpuPercent = 22.0,
                CpuCores = 4,
                RamUsedBytes = 2L * 1024 * 1024 * 1024,
                RamTotalBytes = 8L * 1024 * 1024 * 1024,
                DiskUsedBytes = 20L * 1024 * 1024 * 1024,
                DiskTotalBytes = 100L * 1024 * 1024 * 1024,
                NetworkRxBytesSec = 500,
                NetworkTxBytesSec = 800,
                LoadAvg1m = 0.5,
                LoadAvg5m = 0.4,
                LoadAvg15m = 0.3
            }
        };

        // 1. Batch Insert
        int inserted = await repo.Insert1mBatchAsync(metrics);
        Assert.Equal(2, inserted);

        // 2. Query 1m History
        string since = DateTime.UtcNow.AddDays(-15).ToString("o");
        var history = await repo.Get1mHistoryAsync(systemId, since);
        Assert.Equal(2, history.Count);

        // 3. Aggregate & Prune Rolling Metrics (1m older than 7d rolled up into 1h)
        int prunedCount = await repo.AggregateAndPruneRollingMetricsAsync(retention1mDays: 7, retention1hDays: 30);
        Assert.True(prunedCount >= 1);

        // 4. Verify 1m history now only has recent metric
        var afterPrune1m = await repo.Get1mHistoryAsync(systemId, since);
        Assert.Single(afterPrune1m);
        Assert.Equal(22.0, afterPrune1m[0].CpuPercent);

        // 5. Verify 1h table has the aggregated record
        var history1h = await repo.Get1hHistoryAsync(systemId, since);
        Assert.Single(history1h);
        Assert.Equal(45.5, history1h[0].CpuAvg);
    }

    [Fact]
    public async Task SystemStatusService_Reports_Engine_And_Memory()
    {
        var sysRepo = new SystemRepository(_dbFactory);
        var ringBuffer = new TelemetryRingBuffer();
        var config = new ConfigurationBuilder().Build();

        var service = new SystemStatusService(sysRepo, ringBuffer, config);

        var status = await service.GetStatusAsync();
        Assert.NotNull(status);
        Assert.Equal("sqlite", status.Engine);
        Assert.True(status.IsWalMode);
        Assert.Equal(7, status.RetentionDays);
        Assert.Equal(0, status.TotalSystems);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempDbDir))
            {
                Directory.Delete(_tempDbDir, true);
            }
        }
        catch { }
    }
}
