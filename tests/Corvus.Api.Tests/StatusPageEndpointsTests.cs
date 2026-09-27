using Corvus.Api.Data;
using Corvus.Api.Endpoints;
using Corvus.Api.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Xunit;

namespace Corvus.Api.Tests;

public class StatusPageEndpointsTests
{
    private class FakeServicesRepository : IServicesRepository
    {
        public List<Service> PublicServices { get; set; } = new();

        public Task<List<Service>> GetPublicServicesAsync() => Task.FromResult(PublicServices);
        public Task<List<Service>> GetAllAsync() => Task.FromResult(new List<Service>());
        public Task<Service?> GetByIdAsync(string id) => Task.FromResult<Service?>(null);
        public Task<Service> CreateManualAsync(CreateServiceRequest request) => throw new NotImplementedException();
        public Task<Service?> UpdateAsync(string id, UpdateServiceRequest request) => throw new NotImplementedException();
        public Task<bool> DeleteAsync(string id) => Task.FromResult(true);
        public Task UpsertDockerServiceAsync(Service service) => Task.CompletedTask;
        public Task SyncDockerServicesAsync(List<string> activeContainerIds) => Task.CompletedTask;
        public Task SyncDockerBatchAsync(List<Service> services, List<string> activeContainerIds) => Task.CompletedTask;
        public Task ReorderAsync(List<string> orderedServiceIds) => Task.CompletedTask;
        public Task UpdateSslInfoAsync(string serviceId, int sslExpiryDays, string? sslIssuer) => Task.CompletedTask;
        public Task UpdateStatusAsync(string id, string status) => Task.CompletedTask;
    }

    private class FakeUptimeRepository : IUptimeRepository
    {
        public Dictionary<string, double> Percentages { get; set; } = new();
        public Dictionary<string, List<UptimeCheck>> RecentChecks { get; set; } = new();

        public Task<Dictionary<string, double>> Get24hUptimePercentagesAsync() => Task.FromResult(Percentages);
        public Task<Dictionary<string, List<UptimeCheck>>> GetRecentChecksForServicesAsync(IEnumerable<string> serviceIds, int count = 30)
        {
            var result = new Dictionary<string, List<UptimeCheck>>(StringComparer.OrdinalIgnoreCase);
            foreach (var id in serviceIds)
            {
                if (RecentChecks.TryGetValue(id, out var list))
                {
                    result[id] = list.TakeLast(count).ToList();
                }
                else
                {
                    result[id] = new List<UptimeCheck>();
                }
            }
            return Task.FromResult(result);
        }
        public Task InsertAsync(UptimeCheck check) => Task.CompletedTask;
        public Task<List<UptimeCheck>> GetByServiceAsync(string serviceId, string range = "7d") => Task.FromResult(new List<UptimeCheck>());
        public Task CleanupOldAsync(int retentionDays) => Task.CompletedTask;
        public Task AggregateDailyStatsAsync() => Task.CompletedTask;
        public Task<List<DailyUptimeStat>> GetDailyStatsAsync(string serviceId, int days = 30) => Task.FromResult(new List<DailyUptimeStat>());
    }

    public class FakeIncidentRepository : IIncidentRepository
    {
        public List<ServiceIncident> Incidents { get; set; } = new();

        public Task<List<ServiceIncident>> GetAllAsync() => Task.FromResult(Incidents);
        public Task<List<ServiceIncident>> GetActiveAsync() => 
            Task.FromResult(Incidents.Where(i => i.Status != "resolved" || i.IsPinned).ToList());
        public Task<ServiceIncident?> GetByIdAsync(string id) =>
            Task.FromResult(Incidents.FirstOrDefault(i => i.Id == id));
        public Task<ServiceIncident> CreateAsync(CreateIncidentRequest request)
        {
            var inc = new ServiceIncident
            {
                Id = Guid.NewGuid().ToString(),
                Title = request.Title,
                Message = request.Message,
                Severity = request.Severity ?? "info",
                IsPinned = request.IsPinned ?? true,
                Status = request.Status ?? "investigating"
            };
            Incidents.Add(inc);
            return Task.FromResult(inc);
        }
        public Task<ServiceIncident?> UpdateAsync(string id, UpdateIncidentRequest request)
        {
            var existing = Incidents.FirstOrDefault(i => i.Id == id);
            if (existing == null) return Task.FromResult<ServiceIncident?>(null);
            existing.Title = request.Title;
            existing.Message = request.Message;
            existing.Severity = request.Severity;
            existing.IsPinned = request.IsPinned;
            existing.Status = request.Status;
            return Task.FromResult<ServiceIncident?>(existing);
        }
        public Task<bool> ResolveAsync(string id)
        {
            var existing = Incidents.FirstOrDefault(i => i.Id == id);
            if (existing == null) return Task.FromResult(false);
            existing.Status = "resolved";
            existing.ResolvedAt = DateTime.UtcNow.ToString("o");
            existing.IsPinned = false;
            return Task.FromResult(true);
        }
        public Task<bool> DeleteAsync(string id)
        {
            int removed = Incidents.RemoveAll(i => i.Id == id);
            return Task.FromResult(removed > 0);
        }
    }

    [Fact]
    public async Task GetStatusPageAsync_WhenNoServices_ReturnsNoServicesAndEnabled()
    {
        var servicesRepo = new FakeServicesRepository();
        var uptimeRepo = new FakeUptimeRepository();
        var incidentRepo = new FakeIncidentRepository();

        var result = await StatusPageEndpoints.GetStatusPageAsync(servicesRepo, uptimeRepo, incidentRepo);

        var okResult = Assert.IsType<Ok<PublicStatusPageDto>>(result);
        var dto = okResult.Value;
        Assert.NotNull(dto);
        Assert.True(dto.Enabled);
        Assert.Equal("no_services", dto.SystemStatus);
        Assert.Empty(dto.Services);
        Assert.NotNull(dto.Message);
    }

    [Fact]
    public async Task GetStatusPageAsync_WhenAllHealthy_ReturnsAllOperational()
    {
        var servicesRepo = new FakeServicesRepository
        {
            PublicServices = new List<Service>
            {
                new()
                {
                    Id = "svc-1",
                    Name = "API Gateway",
                    Status = "up",
                    IsPublic = true,
                    IsUptimeEnabled = true,
                    CreatedAt = DateTime.UtcNow.ToString("o"),
                    UpdatedAt = DateTime.UtcNow.ToString("o")
                }
            }
        };
        var uptimeRepo = new FakeUptimeRepository
        {
            Percentages = new Dictionary<string, double> { ["svc-1"] = 99.95 }
        };
        var incidentRepo = new FakeIncidentRepository();

        var result = await StatusPageEndpoints.GetStatusPageAsync(servicesRepo, uptimeRepo, incidentRepo);

        var okResult = Assert.IsType<Ok<PublicStatusPageDto>>(result);
        var dto = okResult.Value;
        Assert.NotNull(dto);
        Assert.True(dto.Enabled);
        Assert.Equal("all_operational", dto.SystemStatus);
        Assert.Single(dto.Services);
        Assert.Equal(99.95, dto.Services[0].UptimePercentage);
        Assert.Null(dto.Message);
    }

    [Fact]
    public async Task GetStatusPageAsync_WhenServiceDegraded_ReturnsSomeDegraded()
    {
        var servicesRepo = new FakeServicesRepository
        {
            PublicServices = new List<Service>
            {
                new()
                {
                    Id = "svc-1",
                    Name = "Search Engine",
                    Status = "degraded",
                    IsPublic = true,
                    IsUptimeEnabled = true,
                    CreatedAt = DateTime.UtcNow.ToString("o"),
                    UpdatedAt = DateTime.UtcNow.ToString("o")
                }
            }
        };
        var uptimeRepo = new FakeUptimeRepository();
        var incidentRepo = new FakeIncidentRepository();

        var result = await StatusPageEndpoints.GetStatusPageAsync(servicesRepo, uptimeRepo, incidentRepo);

        var okResult = Assert.IsType<Ok<PublicStatusPageDto>>(result);
        var dto = okResult.Value;
        Assert.NotNull(dto);
        Assert.True(dto.Enabled);
        Assert.Equal("some_degraded", dto.SystemStatus);
    }

    [Fact]
    public async Task GetStatusPageAsync_WhenServiceDown_ReturnsMajorOutage()
    {
        var servicesRepo = new FakeServicesRepository
        {
            PublicServices = new List<Service>
            {
                new()
                {
                    Id = "svc-1",
                    Name = "Database Cluster",
                    Status = "down",
                    IsPublic = true,
                    IsUptimeEnabled = true,
                    CreatedAt = DateTime.UtcNow.ToString("o"),
                    UpdatedAt = DateTime.UtcNow.ToString("o")
                }
            }
        };
        var uptimeRepo = new FakeUptimeRepository();
        var incidentRepo = new FakeIncidentRepository();

        var result = await StatusPageEndpoints.GetStatusPageAsync(servicesRepo, uptimeRepo, incidentRepo);

        var okResult = Assert.IsType<Ok<PublicStatusPageDto>>(result);
        var dto = okResult.Value;
        Assert.NotNull(dto);
        Assert.True(dto.Enabled);
        Assert.Equal("major_outage", dto.SystemStatus);
    }

    [Fact]
    public async Task GetStatusPageAsync_PopulatesRecentChecks_Successfully()
    {
        var servicesRepo = new FakeServicesRepository
        {
            PublicServices = new List<Service>
            {
                new()
                {
                    Id = "svc-1",
                    Name = "Web App",
                    Status = "up",
                    IsPublic = true,
                    IsUptimeEnabled = true,
                    CreatedAt = DateTime.UtcNow.ToString("o"),
                    UpdatedAt = DateTime.UtcNow.ToString("o")
                }
            }
        };

        var checks = new List<UptimeCheck>
        {
            new() { Id = 1, ServiceId = "svc-1", CheckedAt = "2026-09-27T10:00:00Z", Status = "up", ResponseTimeMs = 45 },
            new() { Id = 2, ServiceId = "svc-1", CheckedAt = "2026-09-27T10:01:00Z", Status = "down", ResponseTimeMs = null, ErrorMessage = "Connection refused" },
            new() { Id = 3, ServiceId = "svc-1", CheckedAt = "2026-09-27T10:02:00Z", Status = "up", ResponseTimeMs = 52 }
        };

        var uptimeRepo = new FakeUptimeRepository
        {
            Percentages = new Dictionary<string, double> { ["svc-1"] = 66.7 },
            RecentChecks = new Dictionary<string, List<UptimeCheck>> { ["svc-1"] = checks }
        };
        var incidentRepo = new FakeIncidentRepository();

        var result = await StatusPageEndpoints.GetStatusPageAsync(servicesRepo, uptimeRepo, incidentRepo);

        var okResult = Assert.IsType<Ok<PublicStatusPageDto>>(result);
        var dto = okResult.Value;
        Assert.NotNull(dto);
        Assert.Single(dto.Services);
        var svc = dto.Services[0];
        Assert.Equal("svc-1", svc.Id);
        Assert.Equal(3, svc.RecentChecks.Count);
        Assert.Equal("up", svc.RecentChecks[0].Status);
        Assert.Equal("down", svc.RecentChecks[1].Status);
        Assert.Equal(52, svc.RecentChecks[2].ResponseTimeMs);
    }

    [Fact]
    public async Task GetStatusPageAsync_IncludesActiveIncidents_Successfully()
    {
        var servicesRepo = new FakeServicesRepository();
        var uptimeRepo = new FakeUptimeRepository();
        var incidentRepo = new FakeIncidentRepository
        {
            Incidents = new List<ServiceIncident>
            {
                new()
                {
                    Id = "inc-1",
                    Title = "Planned Network Maintenance",
                    Message = "Switch upgrades tonight",
                    Severity = "maintenance",
                    IsPinned = true,
                    Status = "monitoring",
                    CreatedAt = DateTime.UtcNow.ToString("o")
                },
                new()
                {
                    Id = "inc-2",
                    Title = "Past Resolved Unpinned Issue",
                    Message = "Resolved long ago",
                    Severity = "warning",
                    IsPinned = false,
                    Status = "resolved",
                    CreatedAt = DateTime.UtcNow.AddDays(-2).ToString("o"),
                    ResolvedAt = DateTime.UtcNow.AddDays(-1).ToString("o")
                }
            }
        };

        var result = await StatusPageEndpoints.GetStatusPageAsync(servicesRepo, uptimeRepo, incidentRepo);

        var okResult = Assert.IsType<Ok<PublicStatusPageDto>>(result);
        var dto = okResult.Value;
        Assert.NotNull(dto);
        Assert.NotNull(dto.Incidents);
        Assert.Single(dto.Incidents);
        Assert.Equal("inc-1", dto.Incidents[0].Id);
        Assert.Equal("Planned Network Maintenance", dto.Incidents[0].Title);
        Assert.Equal("maintenance", dto.Incidents[0].Severity);
    }
}
