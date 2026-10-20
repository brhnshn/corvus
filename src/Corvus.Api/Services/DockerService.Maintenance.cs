using System.Collections.Concurrent;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public partial class DockerService
{
    public Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default) =>
        _client.CreateExecInstanceAsync(containerId, shell, cancellationToken);

    public Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default) =>
        _client.StartExecStreamAsync(execId, cancellationToken);

    public Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default) =>
        _client.ResizeExecAsync(execId, width, height, cancellationToken);

    public async Task<DockerPruneResult> ExecuteSystemPruneAsync(DockerPruneRequest request, CancellationToken cancellationToken = default)
    {
        var result = new DockerPruneResult { Success = true };

        try
        {
            // 1. Containers prune
            if (request.PruneContainers)
            {
                var cRes = await _client.PruneContainersAsync(cancellationToken);
                if (cRes != null)
                {
                    result.ContainersDeletedCount = cRes.ContainersDeleted?.Count ?? 0;
                    result.ContainersSpaceReclaimed = cRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += cRes.SpaceReclaimed;
                }
            }

            // 2. Images prune
            if (request.PruneImages)
            {
                var iRes = await _client.PruneImagesAsync(request.PruneAllImages, cancellationToken);
                if (iRes != null)
                {
                    result.ImagesDeletedCount = iRes.ImagesDeleted?.Count ?? 0;
                    result.ImagesSpaceReclaimed = iRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += iRes.SpaceReclaimed;
                }
            }

            // 3. Volumes prune
            if (request.PruneVolumes)
            {
                var vRes = await _client.PruneVolumesAsync(cancellationToken);
                if (vRes != null)
                {
                    result.VolumesDeletedCount = vRes.VolumesDeleted?.Count ?? 0;
                    result.VolumesSpaceReclaimed = vRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += vRes.SpaceReclaimed;
                }
            }

            // 4. Networks prune
            if (request.PruneNetworks)
            {
                var nRes = await _client.PruneNetworksAsync(cancellationToken);
                if (nRes != null)
                {
                    result.NetworksDeletedCount = nRes.NetworksDeleted?.Count ?? 0;
                }
            }

            // 5. Build cache prune
            if (request.PruneBuildCache)
            {
                var bRes = await _client.PruneBuildCacheAsync(cancellationToken);
                if (bRes != null)
                {
                    result.BuildCacheSpaceReclaimed = bRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += bRes.SpaceReclaimed;
                }
            }

            // Prune sonrası yerel container önbelleğini temizle
            lock (_containersLock)
            {
                _cachedContainers = (DateTime.MinValue, new List<DockerContainerInfo>());
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "System prune sırasında beklenmeyen hata");
            result.Success = false;
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    public Task<DockerSystemDfResponse?> GetSystemDiskUsageAsync(CancellationToken cancellationToken = default) =>
        _client.GetSystemDiskUsageAsync(cancellationToken);

    public async Task<DockerSelectivePruneResult> ExecuteSelectivePruneAsync(DockerSelectivePruneRequest request, CancellationToken cancellationToken = default)
    {
        var result = new DockerSelectivePruneResult { Success = true };

        try
        {
            // 1. Silinecek konteynerler
            if (request.ContainerIds != null && request.ContainerIds.Count > 0)
            {
                foreach (var cId in request.ContainerIds)
                {
                    var delRes = await _client.DeleteContainerAsync(cId, force: true, removeVolumes: false, cancellationToken);
                    if (delRes.Success)
                    {
                        result.DeletedContainers.Add(cId);
                    }
                    else if (!string.IsNullOrWhiteSpace(delRes.Message))
                    {
                        result.Errors.Add($"Container {cId[..Math.Min(12, cId.Length)]}: {delRes.Message}");
                    }
                }
            }

            // 2. Silinecek imajlar
            if (request.ImageIds != null && request.ImageIds.Count > 0)
            {
                foreach (var imgId in request.ImageIds)
                {
                    var delRes = await _client.DeleteImageAsync(imgId, force: false, cancellationToken);
                    if (delRes.Success)
                    {
                        result.DeletedImages.Add(imgId);
                    }
                    else if (!string.IsNullOrWhiteSpace(delRes.Message))
                    {
                        result.Errors.Add($"Image {imgId[..Math.Min(12, imgId.Length)]}: {delRes.Message}");
                    }
                }
            }

            // 3. Silinecek hacimler
            if (request.VolumeNames != null && request.VolumeNames.Count > 0)
            {
                foreach (var vName in request.VolumeNames)
                {
                    var delRes = await _client.DeleteVolumeAsync(vName, force: false, cancellationToken);
                    if (delRes.Success)
                    {
                        result.DeletedVolumes.Add(vName);
                    }
                    else if (!string.IsNullOrWhiteSpace(delRes.Message))
                    {
                        result.Errors.Add($"Volume {vName}: {delRes.Message}");
                    }
                }
            }

            // 4. Build cache
            if (request.PruneBuildCache)
            {
                var bRes = await _client.PruneBuildCacheAsync(cancellationToken);
                if (bRes != null)
                {
                    result.BuildCachePruned = true;
                    result.TotalSpaceReclaimed += bRes.SpaceReclaimed;
                }
            }

            // Konteyner önbelleğini temizle
            InvalidateContainersCache();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Seçici prune sırasında hata");
            result.Success = false;
            result.Errors.Add(ex.Message);
        }

        return result;
    }

    public Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _client.InspectContainerAsync(containerId, cancellationToken);
}
