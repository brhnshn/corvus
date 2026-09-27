using Corvus.Api.Data;
using Corvus.Api.Models;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using System.Data;
using Xunit;

namespace Corvus.Api.Tests;

public class DatabaseMigrationAndRepositoryTests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;

    public DatabaseMigrationAndRepositoryTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        _dbFactory = new DbConnectionFactory(config);

        // Run migrations
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
    }

    [Fact]
    public async Task Migrations_And_ServicesRepository_Work_EndToEnd()
    {
        var repo = new ServicesRepository(_dbFactory);

        // 1. Create manual service
        var req = new CreateServiceRequest(
            Name: "Test Web App",
            Description: "A test web app",
            Url: "https://test.local",
            Icon: "🌐",
            Category: "Testing",
            HealthCheckUrl: "https://test.local/health",
            CheckType: "http",
            Port: 443,
            IsPublic: true
        );

        var created = await repo.CreateManualAsync(req);
        Assert.NotNull(created);
        Assert.Equal("Test Web App", created.Name);
        Assert.True(created.IsPublic);
        Assert.Equal("http", created.CheckType);

        // 2. Update SSL Info & Status
        await repo.UpdateSslInfoAsync(created.Id, 25, "Let's Encrypt Authority");
        await repo.UpdateStatusAsync(created.Id, "down");
        var fetched = await repo.GetByIdAsync(created.Id);
        Assert.NotNull(fetched);
        Assert.Equal(25, fetched.SslExpiryDays);
        Assert.Equal("Let's Encrypt Authority", fetched.SslIssuer);
        Assert.Equal("down", fetched.Status);

        await repo.UpdateStatusAsync(created.Id, "healthy");
        var fetchedUp = await repo.GetByIdAsync(created.Id);
        Assert.NotNull(fetchedUp);
        Assert.Equal("healthy", fetchedUp.Status);

        // 3. Test Public Services query
        var publicList = await repo.GetPublicServicesAsync();
        Assert.Contains(publicList, s => s.Id == created.Id);

        // 4. Test Reordering
        await repo.ReorderAsync([created.Id]);
        var all = await repo.GetAllAsync();
        Assert.NotEmpty(all);

        // 5. Delete service
        bool deleted = await repo.DeleteAsync(created.Id);
        Assert.True(deleted);

        var afterDelete = await repo.GetByIdAsync(created.Id);
        Assert.Null(afterDelete);
    }

    [Fact]
    public async Task DockerService_Update_PreservesUserOverridesAcrossBatchSync()
    {
        var repo = new ServicesRepository(_dbFactory);

        // 1. Initial docker batch sync creates service with localhost URL
        var dockerSvc = new Service
        {
            Id = "docker_burhanlife",
            Source = "docker",
            ContainerId = "container_hash_111",
            Name = "burhanlife_web",
            Url = "http://localhost:5010",
            Status = "healthy",
            CheckType = "http"
        };

        await repo.SyncDockerBatchAsync(new List<Service> { dockerSvc }, new List<string> { "container_hash_111" });

        var initial = await repo.GetByIdAsync("docker_burhanlife");
        Assert.NotNull(initial);
        Assert.Equal("http://localhost:5010", initial.Url);

        // 2. User edits service in UI to set real reverse proxy URL
        var updateReq = new UpdateServiceRequest(
            Name: "BurhanLife Production",
            Description: "Production web portal",
            Url: "https://burhanlife.com",
            Icon: "🚀",
            Category: "Production",
            HealthCheckUrl: "https://burhanlife.com/health",
            CheckType: "http",
            Port: 443,
            IsPublic: true
        );

        var updated = await repo.UpdateAsync("docker_burhanlife", updateReq);
        Assert.NotNull(updated);
        Assert.Equal("https://burhanlife.com", updated.Url);
        Assert.Equal("https://burhanlife.com/health", updated.HealthCheckUrl);
        Assert.Equal("BurhanLife Production", updated.Name);

        // 3. Next discovery batch runs with dummy localhost URL
        await repo.SyncDockerBatchAsync(new List<Service> { dockerSvc }, new List<string> { "container_hash_111" });

        // 4. Overridden URL and healthcheck MUST be preserved!
        var afterSync = await repo.GetByIdAsync("docker_burhanlife");
        Assert.NotNull(afterSync);
        Assert.Equal("https://burhanlife.com", afterSync.Url);
        Assert.Equal("https://burhanlife.com/health", afterSync.HealthCheckUrl);
        Assert.Equal("BurhanLife Production", afterSync.Name);
    }

    [Fact]
    public async Task PushMonitorRepository_Lifecycle_Works()
    {
        var repo = new PushMonitorRepository(_dbFactory);

        var monitor = new PushMonitor
        {
            Id = Guid.NewGuid().ToString("N"),
            Token = "snitch_token_123",
            Name = "Nightly Backup",
            ExpectedIntervalMinutes = 1440,
            GracePeriodMinutes = 60,
            Status = "unknown",
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        // Create
        await repo.CreateAsync(monitor);

        // Fetch
        var fetched = await repo.GetByTokenAsync("snitch_token_123");
        Assert.NotNull(fetched);
        Assert.Equal("Nightly Backup", fetched.Name);
        Assert.Equal("unknown", fetched.Status);

        // Record ping
        await repo.RecordPingAsync("snitch_token_123");
        var pinged = await repo.GetByTokenAsync("snitch_token_123");
        Assert.NotNull(pinged);
        Assert.Equal("healthy", pinged.Status);
        Assert.NotNull(pinged.LastSeenAt);

        // Update status to down
        await repo.UpdateStatusAsync(monitor.Id, "down");
        var downed = await repo.GetByIdAsync(monitor.Id);
        Assert.NotNull(downed);
        Assert.Equal("down", downed.Status);

        // Delete
        bool deleted = await repo.DeleteAsync(monitor.Id);
        Assert.True(deleted);

        var afterDelete = await repo.GetByIdAsync(monitor.Id);
        Assert.Null(afterDelete);
    }

    [Fact]
    public async Task UptimeRepository_Get24hUptimePercentagesAsync_CalculatesCorrectly()
    {
        var servicesRepo = new ServicesRepository(_dbFactory);
        var created = await servicesRepo.CreateManualAsync(new CreateServiceRequest(
            Name: "Uptime Test Svc",
            Description: null,
            Url: "http://localhost",
            Icon: null,
            Category: "Test",
            HealthCheckUrl: null,
            CheckType: "http",
            Port: null,
            IsPublic: true
        ));

        var uptimeRepo = new UptimeRepository(_dbFactory);
        string svcId = created.Id;

        // Insert 3 up checks, 1 down check
        await uptimeRepo.InsertAsync(new UptimeCheck { ServiceId = svcId, CheckedAt = DateTime.UtcNow.AddHours(-1).ToString("o"), Status = "up" });
        await uptimeRepo.InsertAsync(new UptimeCheck { ServiceId = svcId, CheckedAt = DateTime.UtcNow.AddHours(-2).ToString("o"), Status = "up" });
        await uptimeRepo.InsertAsync(new UptimeCheck { ServiceId = svcId, CheckedAt = DateTime.UtcNow.AddHours(-3).ToString("o"), Status = "up" });
        await uptimeRepo.InsertAsync(new UptimeCheck { ServiceId = svcId, CheckedAt = DateTime.UtcNow.AddHours(-4).ToString("o"), Status = "down" });

        var percentages = await uptimeRepo.Get24hUptimePercentagesAsync();
        Assert.True(percentages.ContainsKey(svcId));
        // 3 up out of 4 = 75.0%
        Assert.Equal(75.0, percentages[svcId]);
    }

    [Fact]
    public async Task ServicesRepository_SyncDockerBatchAsync_WorksInSingleTransaction()
    {
        var servicesRepo = new ServicesRepository(_dbFactory);
        var services = new List<Service>
        {
            new() { Id = "docker_c1", Source = "docker", ContainerId = "c1", Name = "Container 1", Status = "healthy", CreatedAt = DateTime.UtcNow.ToString("o"), UpdatedAt = DateTime.UtcNow.ToString("o") },
            new() { Id = "docker_c2", Source = "docker", ContainerId = "c2", Name = "Container 2", Status = "healthy", CreatedAt = DateTime.UtcNow.ToString("o"), UpdatedAt = DateTime.UtcNow.ToString("o") }
        };

        await servicesRepo.SyncDockerBatchAsync(services, ["c1", "c2"]);
        var all = await servicesRepo.GetAllAsync();
        Assert.Contains(all, s => s.Id == "docker_c1");
        Assert.Contains(all, s => s.Id == "docker_c2");

        // Now sync with only c1 active -> c2 should be removed
        await servicesRepo.SyncDockerBatchAsync(services.Take(1).ToList(), ["c1"]);
        var updatedAll = await servicesRepo.GetAllAsync();
        Assert.Contains(updatedAll, s => s.Id == "docker_c1");
        Assert.DoesNotContain(updatedAll, s => s.Id == "docker_c2");
    }

    [Fact]
    public async Task AdvancedUptimeOptions_And_StatusPageSetting_WorkEndToEnd()
    {
        var settingsRepo = new SettingsRepository(_dbFactory);
        var servicesRepo = new ServicesRepository(_dbFactory);

        // 1. Verify default migration value for status_page_enabled
        var statusPageSetting = await settingsRepo.GetAsync("status_page_enabled");
        Assert.Equal("false", statusPageSetting);

        // 2. Create manual service with advanced check options
        var req = new CreateServiceRequest(
            Name: "Advanced Monitor",
            Description: "Monitors with custom parameters",
            Url: "https://example.com",
            Icon: "⚡",
            Category: "Infra",
            HealthCheckUrl: "https://example.com/api/ping",
            CheckType: "http",
            Port: 443,
            IsPublic: false,
            CheckInterval: 30,
            MaxRetries: 3,
            RetryInterval: 15,
            TimeoutSeconds: 10,
            IgnoreTls: true,
            AcceptedStatusCodes: "200-204, 301",
            HttpMethod: "HEAD"
        );

        var created = await servicesRepo.CreateManualAsync(req);
        Assert.NotNull(created);
        Assert.False(created.IsPublic);
        Assert.Equal(30, created.CheckInterval);
        Assert.Equal(3, created.MaxRetries);
        Assert.Equal(15, created.RetryInterval);
        Assert.Equal(10, created.TimeoutSeconds);
        Assert.True(created.IgnoreTls);
        Assert.Equal("200-204, 301", created.AcceptedStatusCodes);
        Assert.Equal("HEAD", created.HttpMethod);

        // 3. Not in public services list (opt-in is 0)
        var publicList = await servicesRepo.GetPublicServicesAsync();
        Assert.DoesNotContain(publicList, s => s.Id == created.Id);

        // 4. Update service to make it public and modify timeout
        var updated = await servicesRepo.UpdateAsync(created.Id, new UpdateServiceRequest(
            Name: created.Name,
            Description: created.Description,
            Url: created.Url,
            Icon: created.Icon,
            Category: created.Category,
            HealthCheckUrl: created.HealthCheckUrl,
            CheckType: created.CheckType,
            Port: created.Port,
            IsPublic: true,
            CheckInterval: 15,
            MaxRetries: 2,
            RetryInterval: 10,
            TimeoutSeconds: 8,
            IgnoreTls: false,
            AcceptedStatusCodes: "200-299",
            HttpMethod: "GET"
        ));

        Assert.NotNull(updated);
        Assert.True(updated.IsPublic);
        Assert.Equal(15, updated.CheckInterval);
        Assert.Equal(8, updated.TimeoutSeconds);
        Assert.False(updated.IgnoreTls);

        var publicListAfter = await servicesRepo.GetPublicServicesAsync();
        Assert.Contains(publicListAfter, s => s.Id == created.Id);

        // 5. Test Docker service with override of advanced options
        var dockerSvc = new Service
        {
            Id = "docker_adv_test",
            Source = "docker",
            ContainerId = "adv_container_999",
            Name = "adv_docker_app",
            Status = "healthy",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o"),
            CheckInterval = 60,
            MaxRetries = 1,
            RetryInterval = 30,
            TimeoutSeconds = 5,
            IgnoreTls = false,
            AcceptedStatusCodes = "200-299",
            HttpMethod = "GET"
        };

        await servicesRepo.UpsertDockerServiceAsync(dockerSvc);

        // User overrides Docker service check interval and accepted codes
        await servicesRepo.UpdateAsync("docker_adv_test", new UpdateServiceRequest(
            Name: "adv_docker_app_custom",
            Description: null,
            Url: null,
            Icon: null,
            Category: null,
            HealthCheckUrl: null,
            CheckType: "http",
            Port: null,
            IsPublic: true,
            CheckInterval: 120,
            MaxRetries: 5,
            RetryInterval: 45,
            TimeoutSeconds: 12,
            IgnoreTls: true,
            AcceptedStatusCodes: "200, 204",
            HttpMethod: "POST"
        ));

        // Re-sync docker batch: override should take precedence!
        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["adv_container_999"]);
        var fetchedDocker = await servicesRepo.GetByIdAsync("docker_adv_test");

        Assert.NotNull(fetchedDocker);
        Assert.Equal("adv_docker_app_custom", fetchedDocker.Name);
        Assert.Equal(120, fetchedDocker.CheckInterval);
        Assert.Equal(5, fetchedDocker.MaxRetries);
        Assert.Equal(45, fetchedDocker.RetryInterval);
        Assert.Equal(12, fetchedDocker.TimeoutSeconds);
        Assert.True(fetchedDocker.IgnoreTls);
        Assert.Equal("200, 204", fetchedDocker.AcceptedStatusCodes);
        Assert.Equal("POST", fetchedDocker.HttpMethod);
        Assert.True(fetchedDocker.IsPublic);
    }

    [Fact]
    public async Task OptInUptime_ManualService_DefaultsToEnabled_AndIncludedInPublic()
    {
        var servicesRepo = new ServicesRepository(_dbFactory);

        var created = await servicesRepo.CreateManualAsync(new CreateServiceRequest(
            Name: "Manual Opt-In Service",
            Description: "Manual check",
            Url: "https://example.com",
            Icon: "⚡",
            Category: "Web",
            HealthCheckUrl: null,
            CheckType: "http",
            Port: 443,
            IsPublic: true
        ));

        Assert.NotNull(created);
        Assert.True(created.IsUptimeEnabled);

        var publicList = await servicesRepo.GetPublicServicesAsync();
        Assert.Contains(publicList, s => s.Id == created.Id);
    }

    [Fact]
    public async Task OptInUptime_DockerService_DefaultsToDisabled_AndStatusSynchronizedDirectly()
    {
        var servicesRepo = new ServicesRepository(_dbFactory);

        var dockerSvc = new Service
        {
            Id = "docker_unmonitored_redis",
            Source = "docker",
            ContainerId = "redis_cont_123",
            Name = "redis_cache",
            Status = "healthy",
            IsUptimeEnabled = false,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["redis_cont_123"]);

        var fetched = await servicesRepo.GetByIdAsync("docker_unmonitored_redis");
        Assert.NotNull(fetched);
        Assert.False(fetched.IsUptimeEnabled);
        Assert.Equal("healthy", fetched.Status);

        // Docker status changed to degraded
        dockerSvc.Status = "degraded";
        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["redis_cont_123"]);

        var fetchedDegraded = await servicesRepo.GetByIdAsync("docker_unmonitored_redis");
        Assert.NotNull(fetchedDegraded);
        Assert.Equal("degraded", fetchedDegraded.Status);

        // Docker status changed to down
        dockerSvc.Status = "down";
        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["redis_cont_123"]);

        var fetchedDown = await servicesRepo.GetByIdAsync("docker_unmonitored_redis");
        Assert.NotNull(fetchedDown);
        Assert.Equal("down", fetchedDown.Status);
    }

    [Fact]
    public async Task OptInUptime_DoubleLock_ExcludesUnmonitoredServicesFromStatusPage()
    {
        var servicesRepo = new ServicesRepository(_dbFactory);

        // 1. Docker service that is public BUT unmonitored (is_uptime_enabled = 0)
        var dockerSvc = new Service
        {
            Id = "docker_internal_db",
            Source = "docker",
            ContainerId = "postgres_cont_555",
            Name = "postgres_db",
            Status = "healthy",
            IsPublic = true,
            IsUptimeEnabled = false,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["postgres_cont_555"]);

        // Double lock check: even if is_public = 1, since is_uptime_enabled = 0 it MUST NOT leak to public status page
        var publicList = await servicesRepo.GetPublicServicesAsync();
        Assert.DoesNotContain(publicList, s => s.Id == "docker_internal_db");

        // 2. User enables uptime tracking
        await servicesRepo.UpdateAsync("docker_internal_db", new UpdateServiceRequest(
            Name: "postgres_db",
            Description: null,
            Url: null,
            Icon: null,
            Category: null,
            HealthCheckUrl: null,
            CheckType: "tcp",
            Port: 5432,
            IsPublic: true,
            IsUptimeEnabled: true
        ));

        var publicListAfterEnable = await servicesRepo.GetPublicServicesAsync();
        Assert.Contains(publicListAfterEnable, s => s.Id == "docker_internal_db");
    }

    [Fact]
    public async Task OptInUptime_WhenEnabled_UptimeStatusPreserved_UnlessContainerStopped()
    {
        var servicesRepo = new ServicesRepository(_dbFactory);

        var dockerSvc = new Service
        {
            Id = "docker_monitored_api",
            Source = "docker",
            ContainerId = "api_cont_777",
            Name = "api_gateway",
            Status = "healthy",
            IsUptimeEnabled = true,
            Url = "http://192.168.1.100:8000",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        };

        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["api_cont_777"]);

        // UptimeChecker marks it degraded because HTTP returns 500
        await servicesRepo.UpdateStatusAsync("docker_monitored_api", "degraded");

        // Docker daemon runs sync with status 'healthy' (container process is running)
        dockerSvc.Status = "healthy";
        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["api_cont_777"]);

        // Since uptime is enabled and container is running, Uptime's 'degraded' status MUST BE preserved!
        var fetched = await servicesRepo.GetByIdAsync("docker_monitored_api");
        Assert.NotNull(fetched);
        Assert.Equal("degraded", fetched.Status);

        // However, if Docker daemon stops container (docker stop -> 'down')
        dockerSvc.Status = "down";
        await servicesRepo.SyncDockerBatchAsync([dockerSvc], ["api_cont_777"]);

        // Status MUST immediately become 'down'!
        var fetchedStopped = await servicesRepo.GetByIdAsync("docker_monitored_api");
        Assert.NotNull(fetchedStopped);
        Assert.Equal("down", fetchedStopped.Status);
    }

    [Fact]
    public async Task UptimeRepository_SmartRetentionAndRollup_WorksCorrectly()
    {
        var servicesRepo = new ServicesRepository(_dbFactory);
        var uptimeRepo = new UptimeRepository(_dbFactory);

        // 1. Create a service
        var svc = await servicesRepo.CreateManualAsync(new CreateServiceRequest(
            Name: "Rollup Test Service",
            Description: "Testing smart retention and daily stats rollup",
            Url: "https://rollup.test",
            Icon: "📊",
            Category: "Test",
            HealthCheckUrl: null,
            CheckType: "http",
            Port: 443,
            IsPublic: true
        ));

        string svcId = svc.Id;

        // 2. Insert checks for yesterday (completed day) and today (uncompleted day)
        var twoDaysAgo = DateTime.UtcNow.AddDays(-2);
        string dateTwoDaysAgo = twoDaysAgo.ToString("yyyy-MM-dd");

        await uptimeRepo.InsertAsync(new UptimeCheck
        {
            ServiceId = svcId,
            CheckedAt = twoDaysAgo.ToString("o"),
            Status = "up",
            ResponseTimeMs = 40,
            IsTransition = false
        });

        await uptimeRepo.InsertAsync(new UptimeCheck
        {
            ServiceId = svcId,
            CheckedAt = twoDaysAgo.AddMinutes(10).ToString("o"),
            Status = "down",
            ResponseTimeMs = null,
            IsTransition = true,
            ErrorMessage = "Connection timeout"
        });

        await uptimeRepo.InsertAsync(new UptimeCheck
        {
            ServiceId = svcId,
            CheckedAt = twoDaysAgo.AddMinutes(20).ToString("o"),
            Status = "up",
            ResponseTimeMs = 60,
            IsTransition = true
        });

        // Today check (within 1 hour ago)
        await uptimeRepo.InsertAsync(new UptimeCheck
        {
            ServiceId = svcId,
            CheckedAt = DateTime.UtcNow.AddHours(-1).ToString("o"),
            Status = "up",
            ResponseTimeMs = 30,
            IsTransition = false
        });

        // 3. Verify is_transition flag was persisted and can be queried
        var checksBefore = await uptimeRepo.GetByServiceAsync(svcId, "7d");
        Assert.Equal(4, checksBefore.Count);
        Assert.False(checksBefore[0].IsTransition);
        Assert.True(checksBefore[1].IsTransition);
        Assert.True(checksBefore[2].IsTransition);
        Assert.False(checksBefore[3].IsTransition);

        // 4. Run AggregateDailyStatsAsync() -> Should summarize completed days (two days ago), but not today
        await uptimeRepo.AggregateDailyStatsAsync();

        var dailyStats = await uptimeRepo.GetDailyStatsAsync(svcId, 30);
        Assert.Single(dailyStats);
        var stat = dailyStats[0];
        Assert.Equal(svcId, stat.ServiceId);
        Assert.Equal(dateTwoDaysAgo, stat.Date);
        Assert.Equal(3, stat.TotalChecks);
        Assert.Equal(2, stat.UpChecks);
        Assert.Equal(50, stat.AvgResponseTimeMs);

        // 5. Run CleanupOldAsync(retentionDays: 30)
        // - Checks older than 24h with is_transition = 0 should be deleted (Check 1 deleted).
        // - Checks older than 24h with is_transition = 1 should be KEPT (Check 2 and Check 3 kept).
        // - Checks within the last 24h should be KEPT (Check 4 kept).
        await uptimeRepo.CleanupOldAsync(30);

        var checksAfter24hCleanup = await uptimeRepo.GetByServiceAsync(svcId, "7d");
        Assert.Equal(3, checksAfter24hCleanup.Count);
        Assert.DoesNotContain(checksAfter24hCleanup, c => !c.IsTransition && c.CheckedAt.StartsWith(dateTwoDaysAgo));
        Assert.Equal(2, checksAfter24hCleanup.Count(c => c.CheckedAt.StartsWith(dateTwoDaysAgo)));
        Assert.Contains(checksAfter24hCleanup, c => c.Status == "down" && c.IsTransition);
        Assert.Contains(checksAfter24hCleanup, c => c.Status == "up" && c.IsTransition);
        Assert.Contains(checksAfter24hCleanup, c => !c.IsTransition);

        // Daily stats must still be intact!
        var dailyStatsAfterCleanup = await uptimeRepo.GetDailyStatsAsync(svcId, 30);
        Assert.Single(dailyStatsAfterCleanup);
        Assert.Equal(3, dailyStatsAfterCleanup[0].TotalChecks);

        // 6. Run CleanupOldAsync(retentionDays: 1) -> Removes all checks older than 1 day (including transitions)
        await uptimeRepo.CleanupOldAsync(1);

        var checksAfterRetention = await uptimeRepo.GetByServiceAsync(svcId, "7d");
        Assert.Single(checksAfterRetention);
        Assert.Equal("up", checksAfterRetention[0].Status);

        // Daily stats remain intact even after raw checks are wiped!
        var dailyStatsPreserved = await uptimeRepo.GetDailyStatsAsync(svcId, 30);
        Assert.Single(dailyStatsPreserved);
        Assert.Equal(3, dailyStatsPreserved[0].TotalChecks);
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
        catch
        {
            // best-effort cleanup on windows temp
        }
    }
}
