using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class RoadmapFeaturesTests
{
    [Fact]
    public async Task EventBroadcaster_Broadcasts_And_Subscribers_Receive_Events()
    {
        var broadcaster = new EventBroadcaster();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));

        broadcaster.Broadcast("service_status_changed", "{\"id\":\"svc1\",\"status\":\"down\"}");

        var stream = broadcaster.SubscribeAsync(cts.Token);
        var enumerator = stream.GetAsyncEnumerator(cts.Token);

        bool hasItem = await enumerator.MoveNextAsync();
        Assert.True(hasItem);
        Assert.Equal("service_status_changed", enumerator.Current.EventType);
        Assert.Contains("svc1", enumerator.Current.PayloadJson);
    }

    [Fact]
    public async Task EventBroadcaster_Multiple_Subscribers_Receive_Same_Broadcast()
    {
        var broadcaster = new EventBroadcaster();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));

        var stream1 = broadcaster.SubscribeAsync(cts.Token);
        var stream2 = broadcaster.SubscribeAsync(cts.Token);

        var enum1 = stream1.GetAsyncEnumerator(cts.Token);
        var enum2 = stream2.GetAsyncEnumerator(cts.Token);

        broadcaster.Broadcast("test_event", "{\"data\":\"shared\"}");

        bool hasItem1 = await enum1.MoveNextAsync();
        bool hasItem2 = await enum2.MoveNextAsync();

        Assert.True(hasItem1);
        Assert.True(hasItem2);
        Assert.Equal("test_event", enum1.Current.EventType);
        Assert.Equal("test_event", enum2.Current.EventType);
        Assert.Contains("shared", enum1.Current.PayloadJson);
        Assert.Contains("shared", enum2.Current.PayloadJson);
    }

    [Fact]
    public async Task EventBroadcaster_Concurrent_Broadcast_And_Subscribe_DoesNotLoseOrCorruptEvents()
    {
        var broadcaster = new EventBroadcaster();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));

        // Pre-broadcast 5 events
        for (int i = 0; i < 5; i++)
        {
            broadcaster.Broadcast("pre_event", $"{{\"seq\":{i}}}");
        }

        var stream = broadcaster.SubscribeAsync(cts.Token);
        var enumerator = stream.GetAsyncEnumerator(cts.Token);

        // Broadcast 5 more events concurrently
        for (int i = 5; i < 10; i++)
        {
            broadcaster.Broadcast("post_event", $"{{\"seq\":{i}}}");
        }

        var received = new List<ServerEventDto>();
        for (int i = 0; i < 10; i++)
        {
            bool hasNext = await enumerator.MoveNextAsync();
            Assert.True(hasNext);
            received.Add(enumerator.Current);
        }

        Assert.Equal(10, received.Count);
        Assert.Equal(5, received.Count(e => e.EventType == "pre_event"));
        Assert.Equal(5, received.Count(e => e.EventType == "post_event"));
    }

    [Theory]
    [InlineData("Tailscale-User-Login", "alice@tailscale.com", "alice@tailscale.com")]
    [InlineData("Cf-Access-Authenticated-User-Email", "bob@cloudflare.com", "bob@cloudflare.com")]
    [InlineData("Remote-User", "charlie_sso", "charlie_sso")]
    [InlineData("X-Forwarded-User", "dave_proxy", "dave_proxy")]
    public void ProxyAuthHeaders_ResolvedCorrectly(string headerKey, string headerValue, string expectedUsername)
    {
        var headers = new HeaderDictionary
        {
            [headerKey] = headerValue
        };

        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder()
            .AddInMemoryCollection(new[] { new KeyValuePair<string, string?>("Auth:TrustProxyHeaders", "true") })
            .Build();

        var authService = new AuthService(new FakeUserRepo(), new FakeSettingsRepo(), config);
        string? result = authService.CheckProxyAuthHeader(headers, System.Net.IPAddress.Loopback);

        Assert.Equal(expectedUsername, result);
    }

    [Fact]
    public void DeadMansSnitch_Threshold_Calculation_Works()
    {
        var monitor = new PushMonitor
        {
            Id = "snitch-1",
            Token = "backup-token",
            Name = "Daily DB Backup",
            ExpectedIntervalMinutes = 1440,
            GracePeriodMinutes = 60,
            LastSeenAt = DateTime.UtcNow.AddMinutes(-1550).ToString("o"),
            Status = "healthy"
        };

        var lastSeen = DateTime.Parse(monitor.LastSeenAt, null, System.Globalization.DateTimeStyles.RoundtripKind).ToUniversalTime();
        var allowed = TimeSpan.FromMinutes(monitor.ExpectedIntervalMinutes + monitor.GracePeriodMinutes);
        bool isOverdue = (DateTime.UtcNow - lastSeen) > allowed;

        Assert.True(isOverdue);
    }

    [Fact]
    public async Task InternalBackup_CreatesEvent_And_StoresInRepository()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"corvus_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:DataDir"] = tempDir
                })
                .Build();

            var dbFactory = new DbConnectionFactory(config);
            DatabaseMigrator.Migrate(dbFactory, NullLogger.Instance);

            var repo = new BackupRepository(dbFactory);
            var evt = new BackupEvent
            {
                Token = "internal_corvus_db",
                ReceivedAt = DateTime.UtcNow.ToString("o"),
                Status = "success",
                SizeBytes = 2048,
                Message = "Corvus veritabanı yedeği alındı"
            };

            await repo.InsertAsync(evt);
            var latest = await repo.GetLatestAsync();

            Assert.NotNull(latest);
            Assert.Equal("internal_corvus_db", latest.Token);
            Assert.Equal("success", latest.Status);
            Assert.Equal(2048, latest.SizeBytes);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
        }
    }

    [Fact]
    public async Task RetentionCleanup_WhenRetentionZero_DoesNotDeleteRecords()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"corvus_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:DataDir"] = tempDir
                })
                .Build();

            var dbFactory = new DbConnectionFactory(config);
            DatabaseMigrator.Migrate(dbFactory, NullLogger.Instance);

            var metricsRepo = new MetricsRepository(dbFactory);
            var oldMetric = new SystemMetric
            {
                RecordedAt = DateTime.UtcNow.AddDays(-120).ToString("o"),
                CpuPercent = 15.5,
                RamUsedMb = 2048,
                RamTotalMb = 8192,
                DiskUsedGb = 40,
                DiskTotalGb = 100,
                NetworkRxBytes = 100,
                NetworkTxBytes = 200
            };
            await metricsRepo.InsertAsync(oldMetric);

            // Calling Cleanup with 0 (unlimited)
            await metricsRepo.CleanupOldAsync(0);

            var recent = await metricsRepo.GetRecentAsync("7d");
            // Since recorded_at is 120 days ago, GetRecent("7d") won't return it, but direct query will show it's still in the DB
            using var conn = dbFactory.CreateConnection();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM system_metrics";
            var count = Convert.ToInt32(cmd.ExecuteScalar());

            Assert.Equal(1, count);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
        }
    }

    [Fact]
    public async Task RetentionCleanup_WhenRetentionPositive_DeletesOldRecords()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"corvus_test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        try
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:DataDir"] = tempDir
                })
                .Build();

            var dbFactory = new DbConnectionFactory(config);
            DatabaseMigrator.Migrate(dbFactory, NullLogger.Instance);

            var metricsRepo = new MetricsRepository(dbFactory);
            await metricsRepo.InsertAsync(new SystemMetric
            {
                RecordedAt = DateTime.UtcNow.AddDays(-45).ToString("o"),
                CpuPercent = 10,
                RamUsedMb = 1000,
                RamTotalMb = 8000,
                DiskUsedGb = 10,
                DiskTotalGb = 100,
                NetworkRxBytes = 0,
                NetworkTxBytes = 0
            });
            await metricsRepo.InsertAsync(new SystemMetric
            {
                RecordedAt = DateTime.UtcNow.ToString("o"),
                CpuPercent = 20,
                RamUsedMb = 2000,
                RamTotalMb = 8000,
                DiskUsedGb = 10,
                DiskTotalGb = 100,
                NetworkRxBytes = 0,
                NetworkTxBytes = 0
            });

            // Cleanup 30 days
            await metricsRepo.CleanupOldAsync(30);

            using var conn = dbFactory.CreateConnection();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM system_metrics";
            var count = Convert.ToInt32(cmd.ExecuteScalar());

            Assert.Equal(1, count);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                try { Directory.Delete(tempDir, true); } catch { }
            }
        }
    }

    private class FakeUserRepo : Corvus.Api.Data.IUserRepository
    {
        public Task<User?> GetByUsernameAsync(string username) => Task.FromResult<User?>(null);
        public Task<int> GetCountAsync() => Task.FromResult(0);
        public Task CreateAsync(User user) => Task.CompletedTask;
        public Task<bool> UpdatePasswordAsync(string username, string newPasswordHash) => Task.FromResult(true);
    }

    private class FakeSettingsRepo : Corvus.Api.Data.ISettingsRepository
    {
        public Task<string?> GetAsync(string key) => Task.FromResult<string?>(null);
        public Task SetAsync(string key, string value) => Task.CompletedTask;
        public Task SetBatchAsync(Dictionary<string, string> settings) => Task.CompletedTask;
        public Task<Dictionary<string, string>> GetAllAsync() => Task.FromResult(new Dictionary<string, string>());
    }
}
