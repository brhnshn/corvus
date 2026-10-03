using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class ContainerTagsTests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;
    private readonly IServicesRepository _servicesRepo;
    private readonly IServiceProvider _serviceProvider;

    public ContainerTagsTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_container_tags_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        _dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
        _servicesRepo = new ServicesRepository(_dbFactory);

        var services = new ServiceCollection();
        services.AddSingleton(_dbFactory);
        services.AddScoped<IServicesRepository, ServicesRepository>();
        _serviceProvider = services.BuildServiceProvider();
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

    [Fact]
    public void UpdateContainerTagsRequest_SerializesAndDeserializes_WithAotContext()
    {
        var request = new UpdateContainerTagsRequest(new List<string> { "Prod", "Database", "Critical" });
        string json = JsonSerializer.Serialize(request, CorvusJsonSerializerContext.Default.UpdateContainerTagsRequest);

        Assert.Contains("\"tags\":[\"Prod\",\"Database\",\"Critical\"]", json);

        var deserialized = JsonSerializer.Deserialize(json, CorvusJsonSerializerContext.Default.UpdateContainerTagsRequest);
        Assert.NotNull(deserialized);
        Assert.Equal(3, deserialized.Tags.Count);
        Assert.Equal("Prod", deserialized.Tags[0]);
        Assert.Equal("Database", deserialized.Tags[1]);
        Assert.Equal("Critical", deserialized.Tags[2]);
    }

    [Fact]
    public async Task DockerService_GetContainersAsync_MergesDbOverrideTagsWithLabelTags()
    {
        string containerId = "aabbccddeeff112233445566";
        
        // 1. Save custom override tags in database
        await _servicesRepo.SaveContainerTagsAsync(containerId, new List<string> { "CustomTag1", "SharedTag" });

        // 2. Mock container with label tags
        var fakeClient = new FakeDockerHttpClientWithContainers(new List<DockerContainerInfo>
        {
            new DockerContainerInfo
            {
                Id = containerId,
                Names = new List<string> { "/redis_cache" },
                State = "running",
                Labels = new Dictionary<string, string>
                {
                    ["corvus.tags"] = "LabelTag1, SharedTag",
                    ["environment"] = "Production"
                }
            }
        });

        var scopeFactory = _serviceProvider.GetRequiredService<IServiceScopeFactory>();
        var dockerService = new DockerService(fakeClient, NullLogger<DockerService>.Instance, scopeFactory);

        // 3. Fetch containers
        var containers = await dockerService.GetContainersAsync();
        Assert.Single(containers);

        var c = containers[0];
        Assert.Equal(4, c.Tags.Count);
        Assert.Contains("LabelTag1", c.Tags);
        Assert.Contains("SharedTag", c.Tags);
        Assert.Contains("Production", c.Tags);
        Assert.Contains("CustomTag1", c.Tags);
    }

    [Fact]
    public async Task SaveContainerTagsAsync_CanClearTagsWithEmptyList()
    {
        string containerId = "container_to_clear_123456";

        // Save tags first
        await _servicesRepo.SaveContainerTagsAsync(containerId, new List<string> { "TagA", "TagB" });
        var tagsDict = await _servicesRepo.GetAllContainerTagsAsync();
        Assert.True(tagsDict.ContainsKey(containerId));
        Assert.Equal(2, tagsDict[containerId].Count);

        // Update with empty list
        await _servicesRepo.SaveContainerTagsAsync(containerId, new List<string>());
        var tagsDictAfter = await _servicesRepo.GetAllContainerTagsAsync();

        // Empty tags list should not be in the dictionary
        Assert.False(tagsDictAfter.ContainsKey(containerId));
    }
}
