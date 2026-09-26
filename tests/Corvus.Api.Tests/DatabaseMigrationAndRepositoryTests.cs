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
