using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IDockerHttpClient
{
    Task<bool> PingAsync(CancellationToken cancellationToken = default);
    Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default);
    Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default);
    Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default);
    Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default);
    Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default);
    Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default);
    Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default);
    Task<DockerContainersPruneResponse?> PruneContainersAsync(CancellationToken cancellationToken = default);
    Task<DockerImagesPruneResponse?> PruneImagesAsync(bool all = false, CancellationToken cancellationToken = default);
    Task<DockerVolumesPruneResponse?> PruneVolumesAsync(CancellationToken cancellationToken = default);
    Task<DockerNetworksPruneResponse?> PruneNetworksAsync(CancellationToken cancellationToken = default);
    Task<DockerBuildCachePruneResponse?> PruneBuildCacheAsync(CancellationToken cancellationToken = default);
    Task<DockerSystemDfResponse?> GetSystemDiskUsageAsync(CancellationToken cancellationToken = default);
    Task<DockerActionResult> DeleteContainerAsync(string containerId, bool force = false, bool removeVolumes = false, CancellationToken cancellationToken = default);
    Task<DockerActionResult> DeleteImageAsync(string imageId, bool force = false, CancellationToken cancellationToken = default);
    Task<DockerActionResult> DeleteVolumeAsync(string volumeName, bool force = false, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UpdateContainerAsync(string containerId, DockerContainerUpdateRequest request, CancellationToken cancellationToken = default);
    Task<DockerImageInspectInfo?> InspectImageAsync(string imageIdOrName, CancellationToken cancellationToken = default);
    Task<bool> PullImageAsync(string imageName, CancellationToken cancellationToken = default);
}
