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

    private IDockerService CreateDockerServiceWithCompose(string composePath)
    {
        var containers = new List<DockerContainerInfo>
        {
            new()
            {
                Id = "c_compose_1",
                Names = new List<string> { "/my_stack_app_1" },
                Labels = new Dictionary<string, string>
                {
                    ["com.docker.compose.project"] = "my_stack",
                    ["com.docker.compose.project.working_dir"] = Path.GetDirectoryName(composePath)!,
                    ["com.docker.compose.project.config_files"] = composePath
                }
            }
        };
        var fakeClient = new FakeDockerHttpClientWithContainers(containers);
        return new DockerService(fakeClient, NullLogger<DockerService>.Instance);
    }

    [Fact]
    public async Task SaveComposeFileAsync_RejectsTabsInYaml()
    {
        string yamlPath = Path.Combine(_tempDir, "compose.yaml");
        await File.WriteAllTextAsync(yamlPath, "services:\n  app:\n    image: nginx");

        var dockerMock = CreateDockerServiceWithCompose(yamlPath);
        var service = new ComposeFileService(dockerMock, NullLogger<ComposeFileService>.Instance);

        string invalidYaml = "services:\n\tapp:\n\t\timage: nginx";
        var result = await service.SaveComposeFileAsync("my_stack", new SaveComposeFileRequest
        {
            Content = invalidYaml
        });

        Assert.False(result.Success);
        Assert.Contains("TAB", result.Message);
        Assert.Contains("boşluk", result.Message);
    }

    [Fact]
    public async Task SaveComposeFileAsync_ValidYaml_SavesYamlAndEnvAndCreatesBackup()
    {
        string yamlPath = Path.Combine(_tempDir, "compose.yaml");
        await File.WriteAllTextAsync(yamlPath, "services:\n  app:\n    image: nginx:1.24");

        var dockerMock = CreateDockerServiceWithCompose(yamlPath);
        var service = new ComposeFileService(dockerMock, NullLogger<ComposeFileService>.Instance);

        string newYaml = "services:\n  app:\n    image: nginx:1.25\n    restart: always";
        string envContent = "PORT=8080\nNODE_ENV=production";

        var result = await service.SaveComposeFileAsync("my_stack", new SaveComposeFileRequest
        {
            Content = newYaml,
            EnvContent = envContent
        });

        Assert.True(result.Success);

        // Check updated compose.yaml
        string savedYaml = await File.ReadAllTextAsync(yamlPath);
        Assert.Equal(newYaml, savedYaml);

        // Check .bak file created
        string bakPath = $"{yamlPath}.bak";
        Assert.True(File.Exists(bakPath));
        string bakContent = await File.ReadAllTextAsync(bakPath);
        Assert.Equal("services:\n  app:\n    image: nginx:1.24", bakContent);

        // Check .env created
        string envPath = Path.Combine(_tempDir, ".env");
        Assert.True(File.Exists(envPath));
        string savedEnv = await File.ReadAllTextAsync(envPath);
        Assert.Equal(envContent, savedEnv);
    }

    [Fact]
    public async Task GetComposeFileAsync_LoadsYamlAndEnvCorrectly()
    {
        string yamlPath = Path.Combine(_tempDir, "compose.yaml");
        await File.WriteAllTextAsync(yamlPath, "services:\n  web:\n    image: redis:alpine");

        string envPath = Path.Combine(_tempDir, ".env");
        await File.WriteAllTextAsync(envPath, "REDIS_PORT=6379");

        var dockerMock = CreateDockerServiceWithCompose(yamlPath);
        var service = new ComposeFileService(dockerMock, NullLogger<ComposeFileService>.Instance);

        var dto = await service.GetComposeFileAsync("my_stack");

        Assert.True(dto.Exists);
        Assert.Equal(yamlPath, dto.FilePath);
        Assert.Contains("redis:alpine", dto.Content);
        Assert.True(dto.EnvExists);
        Assert.Equal("REDIS_PORT=6379", dto.EnvContent);
    }
}
