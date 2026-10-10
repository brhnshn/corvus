using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class ComposeFileServiceTests : IDisposable
{
    private readonly string _tempDir;

    public ComposeFileServiceTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), "corvus_compose_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDir);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempDir))
            {
                Directory.Delete(_tempDir, true);
            }
        }
        catch { }
    }

    private class ComposeFakeDockerHttpClient : DockerServiceTests.FakeDockerHttpClient
    {
        private readonly List<DockerContainerInfo> _containers;

        public ComposeFakeDockerHttpClient(List<DockerContainerInfo> containers)
        {
            _containers = containers;
        }

        public override Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_containers);
        }

        public override Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new DockerActionResult(true, $"Container {containerId} restarted"));
        }
    }

    [Fact]
    public async Task GetComposeFileAsync_WhenProjectNotFound_ReturnsError()
    {
        var fakeClient = new ComposeFakeDockerHttpClient(new List<DockerContainerInfo>());
        var dockerService = new DockerService(fakeClient, NullLogger<DockerService>.Instance);
        var service = new ComposeFileService(dockerService, NullLogger<ComposeFileService>.Instance);

        var result = await service.GetComposeFileAsync("non_existent_project");

        Assert.False(result.Exists);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task GetComposeFileAsync_WhenFileExists_ReadsContentSuccessfully()
    {
        string composePath = Path.Combine(_tempDir, "compose.yaml");
        string originalYaml = "services:\n  web:\n    image: nginx:alpine\n";
        await File.WriteAllTextAsync(composePath, originalYaml);

        var container = new DockerContainerInfo
        {
            Id = "c1",
            Names = new List<string> { "/web" },
            Labels = new Dictionary<string, string>
            {
                ["com.docker.compose.project"] = "my_app",
                ["com.docker.compose.project.working_dir"] = _tempDir,
                ["com.docker.compose.project.config_files"] = composePath
            }
        };

        var fakeClient = new ComposeFakeDockerHttpClient(new List<DockerContainerInfo> { container });
        var dockerService = new DockerService(fakeClient, NullLogger<DockerService>.Instance);
        var service = new ComposeFileService(dockerService, NullLogger<ComposeFileService>.Instance);

        var result = await service.GetComposeFileAsync("my_app");

        Assert.True(result.Exists);
        Assert.Equal("my_app", result.ProjectName);
        Assert.Equal(composePath, result.FilePath);
        Assert.Equal(originalYaml, result.Content);
        Assert.NotNull(result.LastModified);
    }

    [Fact]
    public async Task SaveComposeFileAsync_CreatesBackupAndWritesNewContent()
    {
        string composePath = Path.Combine(_tempDir, "docker-compose.yml");
        string originalYaml = "services:\n  app:\n    image: node:18\n";
        await File.WriteAllTextAsync(composePath, originalYaml);

        var container = new DockerContainerInfo
        {
            Id = "c1",
            Names = new List<string> { "/app" },
            Labels = new Dictionary<string, string>
            {
                ["com.docker.compose.project"] = "node_stack",
                ["com.docker.compose.project.working_dir"] = _tempDir,
                ["com.docker.compose.project.config_files"] = composePath
            }
        };

        var fakeClient = new ComposeFakeDockerHttpClient(new List<DockerContainerInfo> { container });
        var dockerService = new DockerService(fakeClient, NullLogger<DockerService>.Instance);
        var service = new ComposeFileService(dockerService, NullLogger<ComposeFileService>.Instance);

        string updatedYaml = "services:\n  app:\n    image: node:20\n";
        var saveResult = await service.SaveComposeFileAsync("node_stack", new SaveComposeFileRequest
        {
            Content = updatedYaml,
            RestartStack = true
        });

        Assert.True(saveResult.Success);

        // 1. Yeni içerik yazıldı mı?
        string currentContent = await File.ReadAllTextAsync(composePath);
        Assert.Equal(updatedYaml, currentContent);

        // 2. .bak yedeği oluştu mu ve eski içeriği taşıyor mu?
        string backupPath = $"{composePath}.bak";
        Assert.True(File.Exists(backupPath));
        string backupContent = await File.ReadAllTextAsync(backupPath);
        Assert.Equal(originalYaml, backupContent);
    }
}
