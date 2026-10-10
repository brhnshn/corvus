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
}
