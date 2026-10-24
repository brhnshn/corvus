using Corvus.Api.Endpoints;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class ContainerLabelResolutionTests
{
    private const string FullId = "0b277f71b7b6785fbd9f9b3dba59fd7bbb43652fecdc26db0b4223654ce9f238";

    private static IDockerService CreateDocker() =>
        new DockerService(
            new FakeDockerHttpClientWithContainers(new List<DockerContainerInfo>
            {
                new() { Id = FullId, Names = new List<string> { "/corvus_web" } }
            }),
            NullLogger<DockerService>.Instance);

    [Fact]
    public async Task LocalContainer_ResolvesToName()
    {
        var label = await ContainersEndpoints.ResolveContainerLabelAsync(CreateDocker(), "local-host", FullId);
        Assert.Equal("corvus_web", label);
    }

    [Fact]
    public async Task ShortIdPrefix_ResolvesToName()
    {
        var label = await ContainersEndpoints.ResolveContainerLabelAsync(CreateDocker(), "local-host", FullId[..12]);
        Assert.Equal("corvus_web", label);
    }

    [Fact]
    public async Task UnknownOrRemoteContainer_FallsBackToShortId()
    {
        var docker = CreateDocker();
        Assert.Equal("ffffffffffff", await ContainersEndpoints.ResolveContainerLabelAsync(docker, "local-host", new string('f', 64)));
        Assert.Equal(FullId[..12], await ContainersEndpoints.ResolveContainerLabelAsync(docker, "remote-node", FullId));
    }
}
