using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Corvus.Api.Services.Uptime;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

// Konteyner yeniden oluşturulunca (Watchtower, compose up) kullanıcı ayarlarının servise geri bağlanması
// ve Docker keşfinin uptime denetiminin yazdığı durumu ezmemesi
public class UptimeOverrideRebindTests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;
    private readonly ServicesRepository _repo;

    private const string OldId = "aaaaaaaaaaaa1111111111111111111111111111111111111111111111111111";
    private const string NewId = "bbbbbbbbbbbb2222222222222222222222222222222222222222222222222222";

    public UptimeOverrideRebindTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_override_rebind_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Database:DataDir"] = _tempDbDir })
            .Build();
        _dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
        _repo = new ServicesRepository(_dbFactory);
    }

    public void Dispose()
    {
        try { if (Directory.Exists(_tempDbDir)) Directory.Delete(_tempDbDir, recursive: true); } catch { }
    }

    // ContainerDiscoveryService'in DockerService.MapContainerToService ile ürettiği satırın aynısı
    private static Service Discovered(string containerId, string name, string status = "healthy", string? systemId = null) => new()
    {
        Id = $"docker_{containerId[..12]}",
        Source = "docker",
        ContainerId = containerId,
        SystemId = systemId ?? "local-host",
        Name = name,
        Url = "http://localhost:5000",
        Status = status,
        CheckType = "http",
        IsUptimeEnabled = false,
        CreatedAt = DateTime.UtcNow.ToString("o"),
        UpdatedAt = DateTime.UtcNow.ToString("o")
    };

    private Task EnableUptimeAsync(string serviceId, string name) =>
        _repo.UpdateAsync(serviceId, new UpdateServiceRequest(
            Name: name, Description: null, Url: "https://portfolio.example.com/",
            Icon: null, Category: null, HealthCheckUrl: null,
            CheckType: "http", IsPublic: true, IsUptimeEnabled: true));

    [Fact]
    public async Task Recreated_container_with_same_name_keeps_uptime_settings()
    {
        await _repo.SyncDockerBatchAsync([Discovered(OldId, "portfolio_web")], [OldId]);
        await EnableUptimeAsync($"docker_{OldId[..12]}", "portfolio_web");

        await _repo.SyncDockerBatchAsync([Discovered(NewId, "portfolio_web")], [NewId]);

        var svc = await _repo.GetByIdAsync($"docker_{NewId[..12]}");
        Assert.NotNull(svc);
        Assert.True(svc.IsUptimeEnabled);
        Assert.Equal("https://portfolio.example.com/", svc.Url);
    }

    [Fact]
    public async Task Override_saved_under_compose_transient_name_follows_recreated_container()
    {
        // Keşif, compose'un yeniden oluşturma sırasında verdiği geçici adı ("<eski12>_ad") yakalamış
        await _repo.SyncDockerBatchAsync([Discovered(OldId, "331fd0a04c41_corvus_web")], [OldId]);
        await EnableUptimeAsync($"docker_{OldId[..12]}", "331fd0a04c41_corvus_web");

        await _repo.SyncDockerBatchAsync([Discovered(NewId, "corvus_web")], [NewId]);

        var svc = await _repo.GetByIdAsync($"docker_{NewId[..12]}");
        Assert.NotNull(svc);
        Assert.True(svc.IsUptimeEnabled);
    }

    [Fact]
    public async Task Renamed_service_keeps_uptime_settings_after_container_recreated()
    {
        await _repo.SyncDockerBatchAsync([Discovered(OldId, "portfolio_web")], [OldId]);
        await EnableUptimeAsync($"docker_{OldId[..12]}", "Portfolyo Sitesi");

        await _repo.SyncDockerBatchAsync([Discovered(NewId, "portfolio_web")], [NewId]);

        var svc = await _repo.GetByIdAsync($"docker_{NewId[..12]}");
        Assert.NotNull(svc);
        Assert.True(svc.IsUptimeEnabled);
        Assert.Equal("Portfolyo Sitesi", svc.Name);
    }

    [Fact]
    public async Task Override_of_a_remote_node_container_is_not_taken_by_a_local_namesake()
    {
        const string RemoteId = "cccccccccccc3333333333333333333333333333333333333333333333333333";
        await _repo.SyncDockerBatchAsync([Discovered(RemoteId, "portfolio_web", systemId: "node-2")], [RemoteId]);
        await EnableUptimeAsync($"docker_{RemoteId[..12]}", "portfolio_web");

        await _repo.SyncDockerBatchAsync([Discovered(NewId, "portfolio_web")], [NewId]);

        var local = await _repo.GetByIdAsync($"docker_{NewId[..12]}");
        var remote = await _repo.GetByIdAsync($"docker_{RemoteId[..12]}");
        Assert.NotNull(local);
        Assert.NotNull(remote);
        Assert.False(local.IsUptimeEnabled);
        Assert.True(remote.IsUptimeEnabled);
    }

    [Fact]
    public async Task Recreated_container_keeps_uptime_check_history()
    {
        await _repo.SyncDockerBatchAsync([Discovered(OldId, "portfolio_web")], [OldId]);
        await EnableUptimeAsync($"docker_{OldId[..12]}", "portfolio_web");
        var uptime = new UptimeRepository(_dbFactory);
        await uptime.InsertAsync(new UptimeCheck { ServiceId = $"docker_{OldId[..12]}", Status = "up", ResponseTimeMs = 12 });

        await _repo.SyncDockerBatchAsync([Discovered(NewId, "portfolio_web")], [NewId]);

        var history = await uptime.GetByServiceAsync($"docker_{NewId[..12]}", "7d");
        Assert.Single(history);
    }

    [Fact]
    public async Task Daily_stats_orphaned_by_an_earlier_recreate_are_restored()
    {
        await _repo.SyncDockerBatchAsync([Discovered(OldId, "internal-memos")], [OldId]);
        await EnableUptimeAsync($"docker_{OldId[..12]}", "internal-memos");
        string yesterday = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-dd");
        using (var conn = (Microsoft.Data.Sqlite.SqliteConnection)_dbFactory.CreateConnection())
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "INSERT INTO uptime_daily_stats (service_id, date, total_checks, up_checks, avg_response_time_ms) VALUES ($id, $d, 1440, 1440, 20)";
            cmd.Parameters.AddWithValue("$id", $"docker_{OldId[..12]}");
            cmd.Parameters.AddWithValue("$d", yesterday);
            await cmd.ExecuteNonQueryAsync();
        }
        // Eski sürüm: konteyner gitti, servis satırı silindi, istatistik ve ayar sahipsiz kaldı
        const string OtherId = "dddddddddddd4444444444444444444444444444444444444444444444444444";
        await _repo.SyncDockerBatchAsync([Discovered(OtherId, "core-redis")], [OtherId]);

        await _repo.SyncDockerBatchAsync([Discovered(NewId, "internal-memos"), Discovered(OtherId, "core-redis")], [NewId, OtherId]);

        var stats = await new UptimeRepository(_dbFactory).GetDailyStatsAsync($"docker_{NewId[..12]}");
        Assert.Contains(stats, d => d.Date == yesterday && d.TotalChecks == 1440);
    }

    [Fact]
    public async Task Docker_name_is_refreshed_when_transient_compose_name_was_captured_first()
    {
        await _repo.SyncDockerBatchAsync([Discovered(NewId, "e52e83aff78a_portfolio_web")], [NewId]);
        await _repo.SyncDockerBatchAsync([Discovered(NewId, "portfolio_web")], [NewId]);

        var svc = await _repo.GetByIdAsync($"docker_{NewId[..12]}");
        Assert.NotNull(svc);
        Assert.Equal("portfolio_web", svc.Name);
    }

    [Fact]
    public async Task Discovery_does_not_overwrite_checker_status_when_uptime_enabled_only_in_override()
    {
        string id = $"docker_{OldId[..12]}";
        await _repo.SyncDockerBatchAsync([Discovered(OldId, "burhanlife_web")], [OldId]);
        await EnableUptimeAsync(id, "burhanlife_web");
        // Canlıdaki durum: kullanıcı tercihi yalnız service_overrides'ta, services satırı varsayılan 0
        using (var conn = (Microsoft.Data.Sqlite.SqliteConnection)_dbFactory.CreateConnection())
        using (var cmd = conn.CreateCommand())
        {
            cmd.CommandText = "UPDATE services SET is_uptime_enabled = 0 WHERE id = $id";
            cmd.Parameters.AddWithValue("$id", id);
            await cmd.ExecuteNonQueryAsync();
        }

        await _repo.UpdateStatusAsync(id, "down");
        await _repo.SyncDockerBatchAsync([Discovered(OldId, "burhanlife_web", status: "healthy")], [OldId]);

        var svc = await _repo.GetByIdAsync(id);
        Assert.NotNull(svc);
        Assert.True(svc.IsUptimeEnabled);
        Assert.Equal("down", svc.Status);
    }

    [Fact]
    public void Mapped_url_and_port_do_not_depend_on_docker_port_order()
    {
        var docker = new DockerService(new DockerServiceTests.FakeDockerHttpClient(), NullLogger<DockerService>.Instance);
        DockerContainerInfo WithPorts(params int[] ports) => new()
        {
            Id = NewId,
            Names = ["/core-stalwart"],
            State = "running",
            Ports = ports.Select(p => new DockerPortInfo { IP = "0.0.0.0", PrivatePort = p, PublicPort = p, Type = "tcp" }).ToList()
        };

        var first = docker.MapContainerToService(WithPorts(587, 993, 25));
        var second = docker.MapContainerToService(WithPorts(25, 465, 587, 993));
        var third = docker.MapContainerToService(WithPorts(993, 25, 587, 465));

        Assert.Equal(second.Url, third.Url);
        Assert.Equal(second.Port, third.Port);
        Assert.Equal("http://localhost:25", first.Url);
    }

    [Fact]
    public void Running_container_is_checked_even_after_checker_marked_it_down()
    {
        var svc = Discovered(NewId, "burhanlife_web", status: "down");
        var states = new Dictionary<string, string> { [NewId] = "running" };

        Assert.False(UptimeCheckEligibility.IsContainerStopped(svc, states));
    }

    [Fact]
    public void Exited_container_is_skipped()
    {
        var svc = Discovered(NewId, "burhanlife_web", status: "healthy");
        var states = new Dictionary<string, string> { [NewId] = "exited" };

        Assert.True(UptimeCheckEligibility.IsContainerStopped(svc, states));
    }

    [Fact]
    public void Without_docker_state_the_stored_status_decides()
    {
        var svc = Discovered(NewId, "burhanlife_web", status: "down");

        Assert.True(UptimeCheckEligibility.IsContainerStopped(svc, null));
        Assert.True(UptimeCheckEligibility.IsContainerStopped(svc, new Dictionary<string, string>()));
    }
}
