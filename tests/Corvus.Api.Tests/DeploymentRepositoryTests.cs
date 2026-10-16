using Corvus.Api.Data;
using Corvus.Api.Models.Deployments;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class DeploymentRepositoryTests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;
    private readonly IDeploymentRepository _repo;

    public DeploymentRepositoryTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_deploy_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        _dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
        _repo = new DeploymentRepository(_dbFactory);
    }

    [Fact]
    public async Task Create_GetById_And_GetRecent_WorksCorrectly()
    {
        var record = new DeploymentRecord
        {
            Id = "dep_test_1",
            TargetType = "container",
            TargetId = "c_123",
            TargetName = "web-app",
            TriggerType = "manual_ui",
            TriggeredBy = "admin",
            Status = "pending",
            CurrentStep = "queued",
            ImageName = "nginx:latest",
            OldDigest = "sha256:old123",
            DurationMs = 0,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _repo.CreateAsync(record);

        var fetched = await _repo.GetByIdAsync("dep_test_1");
        Assert.NotNull(fetched);
        Assert.Equal("dep_test_1", fetched.Id);
        Assert.Equal("web-app", fetched.TargetName);
        Assert.Equal("pending", fetched.Status);
        Assert.Equal("queued", fetched.CurrentStep);

        // Update step
        await _repo.UpdateStepAsync("dep_test_1", "pulling");
        var updated = await _repo.GetByIdAsync("dep_test_1");
        Assert.NotNull(updated);
        Assert.Equal("pulling", updated.CurrentStep);
        Assert.Equal("in_progress", updated.Status);

        // Complete
        await _repo.CompleteAsync("dep_test_1", "success", "sha256:new456", 12500, null, "Pull complete\nRestarted OK");
        var completed = await _repo.GetByIdAsync("dep_test_1");
        Assert.NotNull(completed);
        Assert.Equal("success", completed.Status);
        Assert.Equal("live", completed.CurrentStep);
        Assert.Equal("sha256:new456", completed.NewDigest);
        Assert.Equal(12500, completed.DurationMs);
        Assert.Contains("Restarted OK", completed.LogOutput);
        Assert.NotNull(completed.CompletedAt);

        // Get Recent with target filter
        var recent = await _repo.GetRecentDeploymentsAsync("c_123", 10);
        Assert.Single(recent);
        Assert.Equal("dep_test_1", recent[0].Id);

        // Get Recent without filter
        var allRecent = await _repo.GetRecentDeploymentsAsync(null, 10);
        Assert.Single(allRecent);
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
