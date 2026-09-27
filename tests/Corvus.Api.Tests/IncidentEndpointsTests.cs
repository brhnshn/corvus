using Corvus.Api.Data;
using Corvus.Api.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class IncidentEndpointsTests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;
    private readonly IncidentRepository _repo;

    public IncidentEndpointsTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_incident_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        _dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
        _repo = new IncidentRepository(_dbFactory);
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
        catch
        {
            // Ignore cleanup errors
        }
    }

    [Fact]
    public async Task CreateAsync_And_GetAllAsync_ReturnsCreatedIncidents()
    {
        var req = new CreateIncidentRequest(
            Title: "Scheduled Maintenance",
            Message: "Upgrading database nodes tonight.",
            Severity: "maintenance",
            IsPinned: true,
            Status: "investigating"
        );

        var created = await _repo.CreateAsync(req);

        Assert.NotNull(created);
        Assert.False(string.IsNullOrWhiteSpace(created.Id));
        Assert.Equal("Scheduled Maintenance", created.Title);
        Assert.Equal("Upgrading database nodes tonight.", created.Message);
        Assert.Equal("maintenance", created.Severity);
        Assert.True(created.IsPinned);
        Assert.Equal("investigating", created.Status);
        Assert.NotNull(created.CreatedAt);
        Assert.Null(created.ResolvedAt);

        var all = await _repo.GetAllAsync();
        Assert.Single(all);
        Assert.Equal(created.Id, all[0].Id);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsCorrectIncident_OrNull()
    {
        var req = new CreateIncidentRequest(
            Title: "API Degraded",
            Message: "Elevated response times.",
            Severity: "warning",
            IsPinned: false,
            Status: "identified"
        );

        var created = await _repo.CreateAsync(req);

        var found = await _repo.GetByIdAsync(created.Id);
        Assert.NotNull(found);
        Assert.Equal("API Degraded", found.Title);
        Assert.False(found.IsPinned);

        var notFound = await _repo.GetByIdAsync("non-existent-id");
        Assert.Null(notFound);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesIncidentProperties()
    {
        var req = new CreateIncidentRequest(
            Title: "Initial Title",
            Message: "Initial Message",
            Severity: "info",
            IsPinned: true,
            Status: "investigating"
        );

        var created = await _repo.CreateAsync(req);

        var updateReq = new UpdateIncidentRequest(
            Title: "Updated Title",
            Message: "Updated Message Details",
            Severity: "critical",
            IsPinned: false,
            Status: "monitoring"
        );

        var updated = await _repo.UpdateAsync(created.Id, updateReq);
        Assert.NotNull(updated);
        Assert.Equal("Updated Title", updated.Title);
        Assert.Equal("Updated Message Details", updated.Message);
        Assert.Equal("critical", updated.Severity);
        Assert.False(updated.IsPinned);
        Assert.Equal("monitoring", updated.Status);

        var reloaded = await _repo.GetByIdAsync(created.Id);
        Assert.NotNull(reloaded);
        Assert.Equal("Updated Title", reloaded.Title);
        Assert.Equal("critical", reloaded.Severity);
        Assert.False(reloaded.IsPinned);
    }

    [Fact]
    public async Task ResolveAsync_SetsStatusToResolved_AndSetsResolvedAt()
    {
        var req = new CreateIncidentRequest(
            Title: "Power Outage",
            Message: "Data center lost main power.",
            Severity: "critical",
            IsPinned: true,
            Status: "investigating"
        );

        var created = await _repo.CreateAsync(req);

        bool resolved = await _repo.ResolveAsync(created.Id);
        Assert.True(resolved);

        var item = await _repo.GetByIdAsync(created.Id);
        Assert.NotNull(item);
        Assert.Equal("resolved", item.Status);
        Assert.NotNull(item.ResolvedAt);
        Assert.False(item.IsPinned);

        bool resolveAgainOnNonExistent = await _repo.ResolveAsync("unknown-id");
        Assert.False(resolveAgainOnNonExistent);
    }

    [Fact]
    public async Task DeleteAsync_RemovesIncident()
    {
        var req = new CreateIncidentRequest(
            Title: "Temporary Alert",
            Message: "Testing alert deletion",
            Severity: "info",
            IsPinned: false,
            Status: "resolved"
        );

        var created = await _repo.CreateAsync(req);

        bool deleted = await _repo.DeleteAsync(created.Id);
        Assert.True(deleted);

        var remaining = await _repo.GetByIdAsync(created.Id);
        Assert.Null(remaining);

        bool deleteAgain = await _repo.DeleteAsync(created.Id);
        Assert.False(deleteAgain);
    }

    [Fact]
    public async Task GetActiveAsync_FiltersResolvedUnpinned_Incidents()
    {
        // 1. Active unpinned
        await _repo.CreateAsync(new CreateIncidentRequest(
            Title: "Active Investigating",
            Message: "Under investigation",
            Severity: "warning",
            IsPinned: false,
            Status: "investigating"
        ));

        // 2. Active pinned
        await _repo.CreateAsync(new CreateIncidentRequest(
            Title: "Critical Outage",
            Message: "Major incident in progress",
            Severity: "critical",
            IsPinned: true,
            Status: "identified"
        ));

        // 3. Resolved unpinned
        var resolvedUnpinned = await _repo.CreateAsync(new CreateIncidentRequest(
            Title: "Past Incident",
            Message: "All done",
            Severity: "info",
            IsPinned: false,
            Status: "investigating"
        ));
        await _repo.ResolveAsync(resolvedUnpinned.Id);

        // 4. Resolved BUT pinned (e.g. maintenance completion announcement)
        var resolvedPinned = await _repo.CreateAsync(new CreateIncidentRequest(
            Title: "Scheduled Maintenance Notice",
            Message: "Maintenance notice remaining pinned",
            Severity: "maintenance",
            IsPinned: true,
            Status: "resolved"
        ));
        // Ensure it stays pinned
        await _repo.UpdateAsync(resolvedPinned.Id, new UpdateIncidentRequest(
            Title: "Scheduled Maintenance Notice",
            Message: "Maintenance notice remaining pinned",
            Severity: "maintenance",
            IsPinned: true,
            Status: "resolved"
        ));

        var active = await _repo.GetActiveAsync();

        // Should include #1 (active), #2 (active pinned), #4 (resolved pinned)
        // Should NOT include #3 (resolved unpinned)
        Assert.Equal(3, active.Count);
        Assert.DoesNotContain(active, i => i.Id == resolvedUnpinned.Id);
        Assert.Contains(active, i => i.Id == resolvedPinned.Id);
    }
}
