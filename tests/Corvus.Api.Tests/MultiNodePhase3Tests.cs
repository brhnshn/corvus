using Corvus.Agent.Models;
using Corvus.Agent.Services;
using Xunit;

namespace Corvus.Api.Tests;

public class MultiNodePhase3Tests
{
    [Fact]
    public void SystemMetricCollector_Collects_Valid_Telemetry_Payload()
    {
        var collector = new SystemMetricCollector();
        var metrics = collector.CollectMetrics();

        Assert.NotNull(metrics);
        Assert.True(metrics.CpuCores >= 1);
        Assert.True(metrics.RamTotalBytes > 0);
        Assert.True(metrics.DiskTotalBytes > 0);
        Assert.True(metrics.CpuPercent >= 0.0f);
    }

    [Fact]
    public async Task AgentDockerClient_Handles_Missing_Socket_Gracefully()
    {
        var dockerClient = new AgentDockerClient();

        // Should return empty list without throwing when socket doesn't exist
        var containers = await dockerClient.GetContainersAsync();
        Assert.NotNull(containers);

        // When executing action on missing socket, returns graceful false response
        var rpcReq = new DockerRpcRequest(Action: "restart", ContainerId: "test-id");
        var resp = await dockerClient.ExecuteRpcActionAsync(rpcReq);
        Assert.False(resp.Success);
        Assert.NotNull(resp.Message);
    }
}
