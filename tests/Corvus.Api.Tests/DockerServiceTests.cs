using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class DockerServiceTests
{
    private class FakeDockerHttpClient : IDockerHttpClient
    {
        public virtual Task<bool> PingAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);
        public virtual Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default) => Task.FromResult<DockerVersionInfo?>(new DockerVersionInfo { Version = "27.0.0" });
        public virtual Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default) => Task.FromResult(new List<DockerContainerInfo>());
        public virtual Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(true, "Yeniden başlatıldı."));
        public virtual Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(true, "Başlatıldı."));
        public virtual Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(true, "Durduruldu."));
        public virtual Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(true, "Duraklatıldı."));
        public virtual Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(true, "Devam ettirildi."));
        public virtual Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default) =>
            Task.FromResult<ContainerStatsDto?>(new ContainerStatsDto(containerId, 12.5, 104857600, 1073741824, 9.77, 2048, 4096));
        public virtual Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default) => Task.FromResult(new List<string> { "log line 1", "log line 2" });
        public virtual Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult<DockerContainerInspectInfo?>(null);
    }

    [Fact]
    public void MapContainerToService_ExtractsLabelsAndDefaultsCorrectly()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var container = new DockerContainerInfo
        {
            Id = "abcdef1234567890",
            Names = new List<string> { "/my_awesome_app" },
            State = "running",
            Status = "Up 2 hours",
            Labels = new Dictionary<string, string>
            {
                ["corvus.name"] = "My Production App",
                ["corvus.category"] = "Web Applications",
                ["corvus.description"] = "Main client dashboard",
                ["corvus.url"] = "https://app.example.com",
                ["corvus.healthcheck"] = "https://app.example.com/health"
            }
        };

        var service = dockerService.MapContainerToService(container);

        Assert.Equal("docker_abcdef123456", service.Id);
        Assert.Equal("My Production App", service.Name);
        Assert.Equal("Web Applications", service.Category);
        Assert.Equal("Main client dashboard", service.Description);
        Assert.Equal("https://app.example.com", service.Url);
        Assert.Equal("https://app.example.com/health", service.HealthCheckUrl);
        Assert.Equal("healthy", service.Status);
    }

    [Fact]
    public void MapContainerToService_DerivesUrlFromPortBindingWhenNoLabel()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var container = new DockerContainerInfo
        {
            Id = "1234567890abcdef",
            Names = new List<string> { "/redis_cache" },
            State = "running",
            Ports = new List<DockerPortInfo>
            {
                new DockerPortInfo { IP = "0.0.0.0", PrivatePort = 6379, PublicPort = 6380, Type = "tcp" }
            }
        };

        var service = dockerService.MapContainerToService(container);

        Assert.Equal("redis_cache", service.Name);
        Assert.Equal("http://localhost:6380", service.Url);
        Assert.Equal("Database", service.Category);
        Assert.Equal("healthy", service.Status);
    }

    [Theory]
    [InlineData("internal-adminer", "Internal")]
    [InlineData("core-postgres", "Core")]
    [InlineData("burhanlife_web", "Web")]
    [InlineData("my-redis", "Database")]
    [InlineData("stalwart-mail", "Mail")]
    [InlineData("random-container", "General")]
    public void DeriveCategoryFromName_DerivesCorrectCategory(string name, string expected)
    {
        var category = DockerService.DeriveCategoryFromName(name);
        Assert.Equal(expected, category);
    }

    [Fact]
    public void MapContainerToService_ExtractsDomainFromTraefikLabel()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var container = new DockerContainerInfo
        {
            Id = "traefik123456",
            Names = new List<string> { "/whoami" },
            State = "running",
            Labels = new Dictionary<string, string>
            {
                ["traefik.http.routers.whoami.rule"] = "Host(`whoami.local.domain`)"
            }
        };

        var service = dockerService.MapContainerToService(container);

        Assert.Equal("https://whoami.local.domain", service.Url);
        Assert.Equal("General", service.Category);
    }

    [Fact]
    public void MapContainerToService_ExtractsDomainAndCategoryFromCaddyAndCompose()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var container = new DockerContainerInfo
        {
            Id = "caddy123456",
            Names = new List<string> { "/grafana" },
            State = "running",
            Labels = new Dictionary<string, string>
            {
                ["caddy"] = "grafana.homelab.lan",
                ["com.docker.compose.project"] = "monitoring"
            }
        };

        var service = dockerService.MapContainerToService(container);

        Assert.Equal("https://grafana.homelab.lan", service.Url);
        Assert.Equal("Monitoring", service.Category);
    }

    [Fact]
    public void MapContainerToService_UsesCorvusPublicHost_WhenSet()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        Environment.SetEnvironmentVariable("CORVUS_PUBLIC_HOST", "192.168.1.100");
        try
        {
            var container = new DockerContainerInfo
            {
                Id = "host123456",
                Names = new List<string> { "/portainer" },
                State = "running",
                Ports = new List<DockerPortInfo>
                {
                    new DockerPortInfo { IP = "0.0.0.0", PrivatePort = 9000, PublicPort = 9000, Type = "tcp" }
                }
            };

            var service = dockerService.MapContainerToService(container);
            Assert.Equal("http://192.168.1.100:9000", service.Url);
        }
        finally
        {
            Environment.SetEnvironmentVariable("CORVUS_PUBLIC_HOST", null);
        }
    }

    [Theory]
    [InlineData("running", "healthy")]
    [InlineData("restarting", "degraded")]
    [InlineData("paused", "degraded")]
    [InlineData("exited", "down")]
    [InlineData("dead", "down")]
    [InlineData("random", "unknown")]
    public void MapContainerToService_MapsContainerStateToCorvusStatus(string state, string expectedStatus)
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var container = new DockerContainerInfo
        {
            Id = "1122334455667788",
            Names = new List<string> { "/test" },
            State = state
        };

        var service = dockerService.MapContainerToService(container);
        Assert.Equal(expectedStatus, service.Status);
    }

    [Theory]
    [InlineData("/my_custom_service", "custom-image:latest", null, false)]
    [InlineData("/ignored_service", "generic-image:latest", "true", true)]
    [InlineData("/active_service", "generic-image:latest", "false", false)]
    public void ShouldIgnoreContainer_IdentifiesIgnoredContainersCorrectly(
        string containerName, 
        string imageName, 
        string? ignoreLabel, 
        bool expectedIgnore)
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var labels = new Dictionary<string, string>();
        if (ignoreLabel != null)
        {
            labels["corvus.ignore"] = ignoreLabel;
        }

        var container = new DockerContainerInfo
        {
            Id = "testcontainer123",
            Names = new List<string> { containerName },
            Image = imageName,
            Labels = labels
        };

        bool actual = dockerService.ShouldIgnoreContainer(container);
        Assert.Equal(expectedIgnore, actual);
    }

    [Fact]
    public async Task ContainerLifecycleMethods_ExecuteSuccessfully()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var started = await dockerService.StartContainerAsync("c1");
        var stopped = await dockerService.StopContainerAsync("c1");
        var paused = await dockerService.PauseContainerAsync("c1");
        var unpaused = await dockerService.UnpauseContainerAsync("c1");

        Assert.True(started.Success);
        Assert.True(stopped.Success);
        Assert.True(paused.Success);
        Assert.True(unpaused.Success);
    }

    [Fact]
    public async Task ContainerLifecycleMethods_ReturnsError_WhenDockerFails()
    {
        var failingClient = new FailingDockerHttpClient();
        var dockerService = new DockerService(failingClient, NullLogger<DockerService>.Instance);

        var started = await dockerService.StartContainerAsync("c1");
        Assert.False(started.Success);
        Assert.Equal("Port 80 is already allocated", started.Message);
        Assert.Equal(500, started.StatusCode);
    }

    private class FailingDockerHttpClient : IDockerHttpClient
    {
        public Task<bool> PingAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);
        public Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default) => Task.FromResult<DockerVersionInfo?>(null);
        public Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default) => Task.FromResult(new List<DockerContainerInfo>());
        public Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(false, "Restart failed", 500));
        public Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(false, "Port 80 is already allocated", 500));
        public Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(false, "Stop failed", 500));
        public Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(false, "Pause failed", 500));
        public Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult(new DockerActionResult(false, "Unpause failed", 500));
        public Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult<ContainerStatsDto?>(null);
        public Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default) => Task.FromResult(new List<string>());
        public Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default) => Task.FromResult<DockerContainerInspectInfo?>(null);
    }

    [Fact]
    public async Task GetContainerStats_ReturnsValidStats()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);
        var stats = await dockerService.GetContainerStatsAsync("c1");

        Assert.NotNull(stats);
        Assert.Equal("c1", stats.ContainerId);
        Assert.Equal(12.5, stats.CpuPercent);
        Assert.Equal(9.77, stats.MemoryPercent);
        Assert.Equal(2048, stats.NetworkRxBytes);
        Assert.Equal(4096, stats.NetworkTxBytes);
    }

    [Fact]
    public async Task GetActiveContainersStatsSummary_ReturnsBatchStatsForRunningContainers()
    {
        var customClient = new BatchFakeDockerHttpClient();
        var dockerService = new DockerService(customClient, NullLogger<DockerService>.Instance);

        var summary = await dockerService.GetActiveContainersStatsSummaryAsync();

        Assert.NotNull(summary);
        Assert.Equal(2, summary.Count);
        Assert.True(summary.ContainsKey("running-1"));
        Assert.True(summary.ContainsKey("running-2"));
        Assert.False(summary.ContainsKey("stopped-3"));
    }

    [Fact]
    public async Task GetContainersAsync_CachesResultWithinTtl()
    {
        var customClient = new CountingDockerHttpClient();
        var dockerService = new DockerService(customClient, NullLogger<DockerService>.Instance);

        var first = await dockerService.GetContainersAsync();
        var second = await dockerService.GetContainersAsync();

        Assert.Equal(1, customClient.ListCallCount);
        Assert.Same(first, second);
    }

    private class BatchFakeDockerHttpClient : FakeDockerHttpClient
    {
        public override Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new List<DockerContainerInfo>
            {
                new() { Id = "running-1", State = "running", Names = new List<string> { "/c1" } },
                new() { Id = "running-2", State = "running", Names = new List<string> { "/c2" } },
                new() { Id = "stopped-3", State = "exited", Names = new List<string> { "/c3" } }
            });
        }
    }

    private class CountingDockerHttpClient : FakeDockerHttpClient
    {
        public int ListCallCount { get; private set; }

        public override Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default)
        {
            ListCallCount++;
            return Task.FromResult(new List<DockerContainerInfo>
            {
                new() { Id = "c1", State = "running", Names = new List<string> { "/c1" } }
            });
        }
    }

    [Fact]
    public void MapContainerToService_ExtractsDomainFromEnvironmentVariables()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var container = new DockerContainerInfo
        {
            Id = "burhanlife123456",
            Names = new List<string> { "/burhanlife_web" },
            State = "running",
            Ports = new List<DockerPortInfo>
            {
                new DockerPortInfo { IP = "127.0.0.1", PrivatePort = 5010, PublicPort = 5010, Type = "tcp" }
            }
        };

        var env = new List<string>
        {
            "ASPNETCORE_ENVIRONMENT=Production",
            "NEXT_PUBLIC_SITE_URL=https://burhansahin.com.tr",
            "PORT=5010"
        };

        var service = dockerService.MapContainerToService(container, env);

        Assert.Equal("https://burhansahin.com.tr", service.Url);
        Assert.Equal("http", service.CheckType);
    }

    [Fact]
    public void MapContainerToService_SetsDockerCheckType_ForInternalAgentWithNoPorts()
    {
        var dockerService = new DockerService(new FakeDockerHttpClient(), NullLogger<DockerService>.Instance);

        var container = new DockerContainerInfo
        {
            Id = "beszel1234567890",
            Names = new List<string> { "/internal-beszel-agent" },
            State = "running",
            Ports = new List<DockerPortInfo>() // No public ports
        };

        var service = dockerService.MapContainerToService(container);

        Assert.Equal("internal-beszel-agent", service.Name);
        Assert.Null(service.Url);
        Assert.Equal("docker", service.CheckType);
        Assert.Equal("healthy", service.Status);
    }

    [Fact]
    public void ExtractDomainFromLabels_SupportsSingleQuotesAndMultipleRules()
    {
        var labels = new Dictionary<string, string>
        {
            ["traefik.http.routers.web.rule"] = "Host('burhanlife.com') || Host('www.burhanlife.com')"
        };

        var url = DockerService.ExtractDomainFromLabels(labels);
        Assert.Equal("https://burhanlife.com", url);
    }
}
