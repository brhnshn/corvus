using Corvus.Api.Data;
using Corvus.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class ActivityLogRepositoryTests
{
    private class TempDbScope : IDisposable
    {
        public string TempDir { get; }
        public IDbConnectionFactory DbFactory { get; }

        public TempDbScope()
        {
            TempDir = Path.Combine(Path.GetTempPath(), "corvus_activity_test_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(TempDir);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:DataDir"] = TempDir
                })
                .Build();

            DbFactory = new DbConnectionFactory(config);
            DatabaseMigrator.Migrate(DbFactory, NullLogger.Instance);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(TempDir))
                {
                    Directory.Delete(TempDir, true);
                }
            }
            catch { }
        }
    }

    [Fact]
    public async Task InsertAsync_And_GetPagedAsync_WorksCorrectly()
    {
        using var scope = new TempDbScope();
        var repo = new ActivityLogRepository(scope.DbFactory);

        var entry1 = new ActivityLogEntry
        {
            Category = "container",
            ActionType = "container.restart",
            ActorUsername = "user:admin",
            TargetResource = "web-nginx",
            DetailsJson = "{}",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };

        var entry2 = new ActivityLogEntry
        {
            Category = "alert",
            ActionType = "alert.firing",
            ActorUsername = "system",
            TargetResource = "High CPU Usage",
            DetailsJson = "{}",
            CreatedAt = DateTime.UtcNow
        };

        await repo.InsertAsync(entry1);
        await repo.InsertAsync(entry2);

        var all = await repo.GetPagedAsync(page: 1, limit: 10);
        Assert.Equal(2, all.TotalCount);
        Assert.Equal(2, all.Items.Count);
        Assert.Equal("alert", all.Items[0].Category); // Descending by CreatedAt

        var containerOnly = await repo.GetPagedAsync(page: 1, limit: 10, category: "container");
        Assert.Equal(1, containerOnly.TotalCount);
        Assert.Equal("web-nginx", containerOnly.Items[0].TargetResource);

        var searchResult = await repo.GetPagedAsync(page: 1, limit: 10, search: "nginx");
        Assert.Equal(1, searchResult.TotalCount);
        Assert.Equal("container.restart", searchResult.Items[0].ActionType);
    }

    [Fact]
    public async Task CleanupOldLogsAsync_RemovesOldLogs()
    {
        using var scope = new TempDbScope();
        var repo = new ActivityLogRepository(scope.DbFactory);

        var oldEntry = new ActivityLogEntry
        {
            Category = "system",
            ActionType = "system.startup",
            ActorUsername = "system",
            TargetResource = "system",
            CreatedAt = DateTime.UtcNow.AddDays(-40)
        };

        var recentEntry = new ActivityLogEntry
        {
            Category = "system",
            ActionType = "system.heartbeat",
            ActorUsername = "system",
            TargetResource = "system",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };

        await repo.InsertAsync(oldEntry);
        await repo.InsertAsync(recentEntry);

        await repo.CleanupOldLogsAsync(30);

        var remaining = await repo.GetPagedAsync(page: 1, limit: 10);
        Assert.Equal(1, remaining.TotalCount);
        Assert.Equal("system.heartbeat", remaining.Items[0].ActionType);
    }

    [Fact]
    public async Task GetPagedAsync_WithSystemId_FiltersCorrectly()
    {
        using var scope = new TempDbScope();
        var repo = new ActivityLogRepository(scope.DbFactory);

        await repo.InsertAsync(new ActivityLogEntry
        {
            ActionType = "host.action",
            Category = "system",
            TargetResource = "host",
            SystemId = "local-host",
            CreatedAt = DateTime.UtcNow.AddMinutes(-2)
        });

        await repo.InsertAsync(new ActivityLogEntry
        {
            ActionType = "edge.action",
            Category = "system",
            TargetResource = "deneme",
            SystemId = "node-wsl-deneme",
            CreatedAt = DateTime.UtcNow.AddMinutes(-1)
        });

        // 1. Filter by specific node: node-wsl-deneme
        var edgeLogs = await repo.GetPagedAsync(systemId: "node-wsl-deneme");
        Assert.Equal(1, edgeLogs.TotalCount);
        Assert.Equal("edge.action", edgeLogs.Items[0].ActionType);

        // 2. Filter by host: local-host
        var hostLogs = await repo.GetPagedAsync(systemId: "local-host");
        Assert.Equal(1, hostLogs.TotalCount);
        Assert.Equal("host.action", hostLogs.Items[0].ActionType);

        // 3. Filter by all fleet: all
        var allLogs = await repo.GetPagedAsync(systemId: "all");
        Assert.Equal(2, allLogs.TotalCount);
    }
}
