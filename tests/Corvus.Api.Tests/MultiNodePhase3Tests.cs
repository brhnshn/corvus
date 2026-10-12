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
        // Explicitly test non-existent socket path (works across Windows & Linux environments with active Docker daemon)
        var dockerClient = new AgentDockerClient("/nonexistent/corvus_test_docker.sock");

        // Should return empty list without throwing when socket doesn't exist
        var containers = await dockerClient.GetContainersAsync();
        Assert.NotNull(containers);
        Assert.Empty(containers);

        // When executing action on missing socket, returns graceful false response
        var rpcReq = new DockerRpcRequest(Action: "restart", ContainerId: "test-id");
        var resp = await dockerClient.ExecuteRpcActionAsync(rpcReq);
        Assert.False(resp.Success);
        Assert.NotNull(resp.Message);
        Assert.Contains("Docker socket not found", resp.Message);
    }

    [Fact]
    public void TelemetryRingBuffer_Stores_And_Retrieves_LocalHost_Telemetry()
    {
        var ringBuffer = new Corvus.Api.Services.Systems.TelemetryRingBuffer();
        var point = new Corvus.Api.Models.Systems.SystemTelemetryPoint(
            timestampUnixSeconds: DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            cpuPercent: 12.5f,
            cpuCores: 4,
            ramUsedBytes: 2048L * 1024L * 1024L,
            ramTotalBytes: 8192L * 1024L * 1024L,
            diskUsedBytes: 20L * 1024L * 1024L * 1024L,
            diskTotalBytes: 100L * 1024L * 1024L * 1024L,
            netRxBytesSec: 1024,
            netTxBytesSec: 2048,
            loadAvg1m: 0.5f,
            loadAvg5m: 0.3f,
            loadAvg15m: 0.1f
        );

        ringBuffer.Push("local-host", in point);

        bool found = ringBuffer.TryGetLatest("local-host", out var retrieved);
        Assert.True(found);
        Assert.Equal(12.5f, retrieved.CpuPercent);
        Assert.Equal(4, retrieved.CpuCores);
        Assert.Equal(2048L * 1024L * 1024L, retrieved.RamUsedBytes);
    }
}
