using Corvus.Api.Models;
using Corvus.Api.Services.Docker;

namespace Corvus.Api.Services;

public class DockerHttpClient : IDockerHttpClient, IDisposable
{
    private readonly IDockerHttpTransport _transport;
    private readonly DockerSystemClient _systemClient;
    private readonly DockerContainerClient _containerClient;
    private readonly DockerImageClient _imageClient;
    private readonly DockerVolumeClient _volumeClient;
    private readonly DockerExecClient _execClient;

    public DockerHttpClient(ILogger<DockerHttpClient> logger, IConfiguration configuration)
    {
        _transport = new DockerHttpTransport(configuration);
        _systemClient = new DockerSystemClient(_transport, logger);
        _containerClient = new DockerContainerClient(_transport, logger);
        _imageClient = new DockerImageClient(_transport, logger);
        _volumeClient = new DockerVolumeClient(_transport, logger);
        _execClient = new DockerExecClient(_transport, logger);
    }

    public Task<bool> PingAsync(CancellationToken cancellationToken = default) =>
        _systemClient.PingAsync(cancellationToken);

    public Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default) =>
        _systemClient.GetVersionAsync(cancellationToken);

    public Task<DockerSystemDfResponse?> GetSystemDiskUsageAsync(CancellationToken cancellationToken = default) =>
        _systemClient.GetSystemDiskUsageAsync(cancellationToken);

    public Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default) =>
        _containerClient.ListContainersAsync(all, cancellationToken);

    public Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _containerClient.InspectContainerAsync(containerId, cancellationToken);

    public Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _containerClient.RestartContainerAsync(containerId, cancellationToken);

    public Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _containerClient.StartContainerAsync(containerId, cancellationToken);

    public Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _containerClient.StopContainerAsync(containerId, cancellationToken);

    public Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _containerClient.PauseContainerAsync(containerId, cancellationToken);

    public Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _containerClient.UnpauseContainerAsync(containerId, cancellationToken);

    public Task<DockerActionResult> DeleteContainerAsync(string containerId, bool force = false, bool removeVolumes = false, CancellationToken cancellationToken = default) =>
        _containerClient.DeleteContainerAsync(containerId, force, removeVolumes, cancellationToken);

    public Task<DockerActionResult> UpdateContainerAsync(string containerId, DockerContainerUpdateRequest request, CancellationToken cancellationToken = default) =>
        _containerClient.UpdateContainerAsync(containerId, request, cancellationToken);

    public Task<DockerContainersPruneResponse?> PruneContainersAsync(CancellationToken cancellationToken = default) =>
        _containerClient.PruneContainersAsync(cancellationToken);

    public Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default) =>
        _containerClient.GetContainerLogsAsync(containerId, tail, cancellationToken);

    public Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default) =>
        _containerClient.GetContainerStatsAsync(containerId, cancellationToken);

    public Task<DockerImageInspectInfo?> InspectImageAsync(string imageIdOrName, CancellationToken cancellationToken = default) =>
        _imageClient.InspectImageAsync(imageIdOrName, cancellationToken);

    public Task<bool> PullImageAsync(string imageName, CancellationToken cancellationToken = default) =>
        _imageClient.PullImageAsync(imageName, cancellationToken);

    public Task<DockerImagesPruneResponse?> PruneImagesAsync(bool all = false, CancellationToken cancellationToken = default) =>
        _imageClient.PruneImagesAsync(all, cancellationToken);

    public Task<DockerActionResult> DeleteImageAsync(string imageId, bool force = false, CancellationToken cancellationToken = default) =>
        _imageClient.DeleteImageAsync(imageId, force, cancellationToken);

    public Task<DockerVolumesPruneResponse?> PruneVolumesAsync(CancellationToken cancellationToken = default) =>
        _volumeClient.PruneVolumesAsync(cancellationToken);

    public Task<DockerNetworksPruneResponse?> PruneNetworksAsync(CancellationToken cancellationToken = default) =>
        _volumeClient.PruneNetworksAsync(cancellationToken);

    public Task<DockerBuildCachePruneResponse?> PruneBuildCacheAsync(CancellationToken cancellationToken = default) =>
        _volumeClient.PruneBuildCacheAsync(cancellationToken);

    public Task<DockerActionResult> DeleteVolumeAsync(string volumeName, bool force = false, CancellationToken cancellationToken = default) =>
        _volumeClient.DeleteVolumeAsync(volumeName, force, cancellationToken);

    public Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default) =>
        _execClient.CreateExecInstanceAsync(containerId, shell, cancellationToken);

    public Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default) =>
        _execClient.StartExecStreamAsync(execId, cancellationToken);

    public Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default) =>
        _execClient.ResizeExecAsync(execId, width, height, cancellationToken);

    public void Dispose()
    {
        _transport.Dispose();
    }
}
