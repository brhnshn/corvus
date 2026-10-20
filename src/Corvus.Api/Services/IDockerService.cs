using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IDockerService
{
    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
    Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default);
    Task<List<DockerContainerInfo>> GetContainersAsync(CancellationToken cancellationToken = default);
    Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> DeleteContainerAsync(string containerId, bool force = false, bool removeVolumes = false, CancellationToken cancellationToken = default);
    void MarkContainerManuallyStopped(string containerId);
    void ClearContainerManualStop(string containerId);
    bool IsContainerManuallyStopped(string containerId);
    Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default);
    Task<Dictionary<string, ContainerStatsDto>> GetActiveContainersStatsSummaryAsync(CancellationToken cancellationToken = default);
    Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default);
    Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default);
    Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default);
    Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default);
    Task<DockerPruneResult> ExecuteSystemPruneAsync(DockerPruneRequest request, CancellationToken cancellationToken = default);
    Task<DockerSystemDfResponse?> GetSystemDiskUsageAsync(CancellationToken cancellationToken = default);
    Task<DockerSelectivePruneResult> ExecuteSelectivePruneAsync(DockerSelectivePruneRequest request, CancellationToken cancellationToken = default);
    Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UpdateContainerAsync(string containerId, DockerContainerUpdateRequest request, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UpdateContainerConfigAsync(string containerId, ContainerResourceUpdateRequest request, CancellationToken cancellationToken = default);
    Task<ContainerImageUpdateInfo> CheckContainerUpdateAsync(string containerId, CancellationToken cancellationToken = default);
    Task<List<ContainerImageUpdateInfo>> CheckAllContainersUpdateAsync(CancellationToken cancellationToken = default);
    Task<DockerActionResult> RecreateContainerAsync(string containerId, bool pullLatest = true, CancellationToken cancellationToken = default);
    bool ShouldIgnoreContainer(DockerContainerInfo container);
    Service MapContainerToService(DockerContainerInfo container, IEnumerable<string>? env = null);
    void InvalidateContainersCache();
}
