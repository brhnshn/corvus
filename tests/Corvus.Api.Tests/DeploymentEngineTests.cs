using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Deployments;
using Corvus.Api.Services;
using Corvus.Api.Services.Deployments;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class DeploymentEngineTests : IDisposable
{
    private class MockDeploymentHttpClient : DockerServiceTests.FakeDockerHttpClient
    {
        public bool ShouldPullFail { get; set; }
        public bool ShouldStartCrash { get; set; }
        public int PullCount { get; private set; }
        public int StartCount { get; private set; }
        public int StopCount { get; private set; }
        public int RenameCount { get; private set; }
        public int DeleteCount { get; private set; }

        public override Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default)
        {
            if (containerId.Contains("invalid") || containerId.Contains("new_web")) return Task.FromResult<DockerContainerInspectInfo?>(null);

            if (containerId.Contains("corvus"))
            {
                return Task.FromResult<DockerContainerInspectInfo?>(new DockerContainerInspectInfo
                {
                    Id = containerId,
                    Name = "/corvus-api",
                    Image = "ghcr.io/corvus/corvus:latest",
                    Config = new DockerContainerConfig
                    {
                        Image = "ghcr.io/corvus/corvus:latest",
                        Env = new List<string> { "CORVUS_PORT=8090" }
                    },
                    State = new DockerContainerState { Running = true }
                });
            }

            var info = new DockerContainerInspectInfo
            {
                Id = containerId,
                Name = "/my-service",
                Image = "sha256:current123",
                Config = new DockerContainerConfig
                {
                    Image = "redis:7-alpine"
                },
                State = new DockerContainerState
                {
                    Running = !(ShouldStartCrash && containerId == "new_created_container_id"),
                    ExitCode = ShouldStartCrash && containerId == "new_created_container_id" ? 1 : 0
                }
            };
            return Task.FromResult<DockerContainerInspectInfo?>(info);
        }

        public override Task<bool> PullImageProgressAsync(string imageName, Func<string, Task>? onLogChunk = null, CancellationToken cancellationToken = default)
        {
            PullCount++;
            if (ShouldPullFail) return Task.FromResult(false);

            onLogChunk?.Invoke("Layer 1: Downloaded\n");
            onLogChunk?.Invoke("Digest: sha256:new789\n");
            return Task.FromResult(true);
        }

        public override Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default)
        {
            StopCount++;
            return Task.FromResult(new DockerActionResult(true, "Stopped"));
        }

        public override Task<DockerActionResult> RenameContainerAsync(string containerId, string newName, CancellationToken cancellationToken = default)
        {
            RenameCount++;
            return Task.FromResult(new DockerActionResult(true, "Renamed"));
        }

        public override Task<DockerContainerCreateResponse?> CreateContainerAsync(string? name, DockerContainerCreateRequest request, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<DockerContainerCreateResponse?>(new DockerContainerCreateResponse { Id = "new_created_container_id" });
        }

        public override Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default)
        {
            StartCount++;
            return Task.FromResult(new DockerActionResult(true, "Started"));
        }

        public override Task<DockerActionResult> DeleteContainerAsync(string containerId, bool force = false, bool removeVolumes = false, CancellationToken cancellationToken = default)
        {
            DeleteCount++;
            return Task.FromResult(new DockerActionResult(true, "Deleted"));
        }

        public override Task<DockerImageInspectInfo?> InspectImageAsync(string imageIdOrName, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<DockerImageInspectInfo?>(new DockerImageInspectInfo { Id = "sha256:new789" });
        }
    }

    private class MockDeploymentRepo : IDeploymentRepository
    {
        public readonly Dictionary<string, DeploymentRecord> Records = new();

        public Task CreateAsync(DeploymentRecord record)
        {
            Records[record.Id] = record;
            return Task.CompletedTask;
        }

        public Task UpdateStepAsync(string id, string step)
        {
            if (Records.TryGetValue(id, out var r))
            {
                r.CurrentStep = step;
                if (r.Status == "pending") r.Status = "in_progress";
            }
            return Task.CompletedTask;
        }

        public Task CompleteAsync(string id, string status, string? newDigest, long durationMs, string? error, string? logOutput)
        {
            if (Records.TryGetValue(id, out var r))
            {
                r.Status = status;
                r.NewDigest = newDigest;
                r.DurationMs = durationMs;
                r.ErrorMessage = error;
                r.LogOutput = logOutput;
            }
            return Task.CompletedTask;
        }

        public Task<DeploymentRecord?> GetByIdAsync(string id)
        {
            Records.TryGetValue(id, out var r);
            return Task.FromResult(r);
        }

        public Task<List<DeploymentRecord>> GetRecentDeploymentsAsync(string? targetId = null, int limit = 50)
        {
            return Task.FromResult(Records.Values.ToList());
        }
    }

    private class MockBroadcaster : IEventBroadcaster
    {
        public readonly List<(string Type, string Json)> Broadcasts = new();

        public void Broadcast(string eventType, string payloadJson)
        {
            Broadcasts.Add((eventType, payloadJson));
        }

        public async IAsyncEnumerable<ServerEventDto> SubscribeAsync([System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken)
        {
            await Task.Yield();
            yield break;
        }
    }

    [Fact]
    public async Task StartDeploymentAsync_SuccessFlow_CompletesLive()
    {
        var client = new MockDeploymentHttpClient();
        var repo = new MockDeploymentRepo();
        var lockMgr = new DeploymentLockManager();
        var bcast = new MockBroadcaster();
        var engine = new DeploymentEngine(client, repo, lockMgr, bcast, NullLogger<DeploymentEngine>.Instance);

        var record = await engine.StartDeploymentAsync("c_ok", "manual_ui", "user");
        Assert.NotNull(record);
        Assert.Equal("pending", record.Status);

        // Bekle
        await engine.WaitForCompletionAsync(record.Id, TimeSpan.FromSeconds(5));

        var finished = await repo.GetByIdAsync(record.Id);
        Assert.NotNull(finished);
        Assert.Equal("success", finished.Status);
        Assert.Equal("live", finished.CurrentStep);
        Assert.Equal("sha256:new789", finished.NewDigest);
        Assert.True(finished.DurationMs >= 0);
        Assert.Contains("Dağıtım başarıyla tamamlandı", finished.LogOutput);

        // Kilit işlem bitince serbest bırakılmış olmalı
        Assert.False(lockMgr.IsLocked("c_ok"));
    }

    [Fact]
    public async Task StartDeploymentAsync_WhenPullFails_FailFast_KeepsExistingContainerUntouched()
    {
        var client = new MockDeploymentHttpClient { ShouldPullFail = true };
        var repo = new MockDeploymentRepo();
        var lockMgr = new DeploymentLockManager();
        var bcast = new MockBroadcaster();
        var engine = new DeploymentEngine(client, repo, lockMgr, bcast, NullLogger<DeploymentEngine>.Instance);

        var record = await engine.StartDeploymentAsync("c_fail_pull", "manual_ui", "user");

        await engine.WaitForCompletionAsync(record.Id, TimeSpan.FromSeconds(5));

        var finished = await repo.GetByIdAsync(record.Id);
        Assert.NotNull(finished);
        Assert.Equal("failed", finished.Status);
        Assert.Contains("Pre-pull fail-fast", finished.ErrorMessage);

        // Konteyner ASLA durdurulmadı (0 stop çağrısı)
        Assert.Equal(0, client.StopCount);
        Assert.False(lockMgr.IsLocked("c_fail_pull"));
    }

    [Fact]
    public async Task StartDeploymentAsync_WhenNewContainerCrashes_RollsBackToBackup()
    {
        var client = new MockDeploymentHttpClient { ShouldStartCrash = true };
        var repo = new MockDeploymentRepo();
        var lockMgr = new DeploymentLockManager();
        var bcast = new MockBroadcaster();
        var engine = new DeploymentEngine(client, repo, lockMgr, bcast, NullLogger<DeploymentEngine>.Instance);

        var record = await engine.StartDeploymentAsync("c_crash", "manual_ui", "user");

        await engine.WaitForCompletionAsync(record.Id, TimeSpan.FromSeconds(5));

        var finished = await repo.GetByIdAsync(record.Id);
        Assert.NotNull(finished);
        Assert.Equal("rolled_back", finished.Status);
        Assert.Contains("Rollback başarılı", finished.LogOutput);

        // Geri alma adımları yapıldı: Eski ad geri verildi
        Assert.True(client.RenameCount >= 2);
        Assert.False(lockMgr.IsLocked("c_crash"));
    }

    [Fact]
    public async Task StartDeploymentAsync_WhenTargetIsCorvusSelf_ThrowsInvalidOperationException_Preventing502()
    {
        var client = new MockDeploymentHttpClient();
        var repo = new MockDeploymentRepo();
        var lockMgr = new DeploymentLockManager();
        var bcast = new MockBroadcaster();
        var engine = new DeploymentEngine(client, repo, lockMgr, bcast, NullLogger<DeploymentEngine>.Instance);

        // Corvus container inspect info taklidi
        var selfContainerInspect = new DockerContainerInspectInfo
        {
            Id = "corvus_prod_123",
            Name = "/corvus-api",
            Config = new DockerContainerConfig
            {
                Image = "ghcr.io/corvus/corvus:latest",
                Env = new List<string> { "CORVUS_PORT=8090", "CORVUS_DATA_DIR=/data" }
            }
        };

        // Mock client inspect override için containerId 'corvus' içeren ID ile çağrıldığında
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            engine.StartDeploymentAsync("corvus_api", "manual_ui", "user"));

        Assert.Contains("502 Bad Gateway", ex.Message);
    }

    [Fact]
    public async Task StartScratchDeploymentAsync_SuccessfulPipeline_CreatesAndStartsContainer()
    {
        var client = new MockDeploymentHttpClient();
        var repo = new MockDeploymentRepo();
        var lockMgr = new DeploymentLockManager();
        var bcast = new MockBroadcaster();
        var engine = new DeploymentEngine(client, repo, lockMgr, bcast, NullLogger<DeploymentEngine>.Instance);

        var req = new ScratchDeploymentRequest(
            Image: "nginx:alpine",
            ContainerName: "new_web",
            Ports: "8080:80",
            Env: "ENV=production\nPORT=80",
            RestartPolicy: "unless-stopped"
        );

        var record = await engine.StartScratchDeploymentAsync(req, "tester");
        Assert.NotNull(record);
        Assert.Equal("new_web", record.TargetName);
        Assert.Equal("manual_scratch", record.TriggerType);

        await engine.WaitForCompletionAsync(record.Id, TimeSpan.FromSeconds(5));

        var finished = await repo.GetByIdAsync(record.Id);
        Assert.NotNull(finished);
        Assert.Equal("success", finished.Status);
        Assert.Equal("completed", finished.CurrentStep);
        Assert.Contains("Sıfırdan Dağıtım Başarıyla Tamamlandı", finished.LogOutput);
    }

    [Fact]
    public async Task StartScratchDeploymentAsync_WhenContainerAlreadyExists_ThrowsConflict()
    {
        var client = new MockDeploymentHttpClient();
        var repo = new MockDeploymentRepo();
        var lockMgr = new DeploymentLockManager();
        var bcast = new MockBroadcaster();
        var engine = new DeploymentEngine(client, repo, lockMgr, bcast, NullLogger<DeploymentEngine>.Instance);

        // 'my-service' mock client'ta var
        var req = new ScratchDeploymentRequest(
            Image: "redis:alpine",
            ContainerName: "my-service"
        );

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            engine.StartScratchDeploymentAsync(req, "tester"));

        Assert.Contains("zaten mevcut", ex.Message);
    }

    public void Dispose() { }
}
