using System.Text.Json;
using System.Text.Json.Serialization;

namespace Corvus.Api.Models;

public class DockerPruneRequest
{
    [JsonPropertyName("pruneContainers")]
    public bool PruneContainers { get; set; } = true;

    [JsonPropertyName("pruneImages")]
    public bool PruneImages { get; set; } = true;

    [JsonPropertyName("pruneAllImages")]
    public bool PruneAllImages { get; set; } = false;

    [JsonPropertyName("pruneVolumes")]
    public bool PruneVolumes { get; set; } = false;

    [JsonPropertyName("pruneNetworks")]
    public bool PruneNetworks { get; set; } = true;

    [JsonPropertyName("pruneBuildCache")]
    public bool PruneBuildCache { get; set; } = true;
}

public class DockerPruneResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("totalSpaceReclaimed")]
    public long TotalSpaceReclaimed { get; set; }

    [JsonPropertyName("containersSpaceReclaimed")]
    public long ContainersSpaceReclaimed { get; set; }

    [JsonPropertyName("containersDeletedCount")]
    public int ContainersDeletedCount { get; set; }

    [JsonPropertyName("imagesSpaceReclaimed")]
    public long ImagesSpaceReclaimed { get; set; }

    [JsonPropertyName("imagesDeletedCount")]
    public int ImagesDeletedCount { get; set; }

    [JsonPropertyName("volumesSpaceReclaimed")]
    public long VolumesSpaceReclaimed { get; set; }

    [JsonPropertyName("volumesDeletedCount")]
    public int VolumesDeletedCount { get; set; }

    [JsonPropertyName("networksDeletedCount")]
    public int NetworksDeletedCount { get; set; }

    [JsonPropertyName("buildCacheSpaceReclaimed")]
    public long BuildCacheSpaceReclaimed { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}

public class DockerContainersPruneResponse
{
    [JsonPropertyName("ContainersDeleted")]
    public List<string>? ContainersDeleted { get; set; }

    [JsonPropertyName("SpaceReclaimed")]
    public long SpaceReclaimed { get; set; }
}

public class DockerImagesPruneResponse
{
    [JsonPropertyName("ImagesDeleted")]
    public List<JsonElement>? ImagesDeleted { get; set; }

    [JsonPropertyName("SpaceReclaimed")]
    public long SpaceReclaimed { get; set; }
}

public class DockerVolumesPruneResponse
{
    [JsonPropertyName("VolumesDeleted")]
    public List<string>? VolumesDeleted { get; set; }

    [JsonPropertyName("SpaceReclaimed")]
    public long SpaceReclaimed { get; set; }
}

public class DockerNetworksPruneResponse
{
    [JsonPropertyName("NetworksDeleted")]
    public List<string>? NetworksDeleted { get; set; }
}

public class DockerBuildCachePruneResponse
{
    [JsonPropertyName("SpaceReclaimed")]
    public long SpaceReclaimed { get; set; }
}

public class DockerSystemDfResponse
{
    [JsonPropertyName("LayersSize")]
    public long LayersSize { get; set; }

    [JsonPropertyName("Images")]
    public List<DockerDfImageInfo>? Images { get; set; }

    [JsonPropertyName("Containers")]
    public List<DockerDfContainerInfo>? Containers { get; set; }

    [JsonPropertyName("Volumes")]
    public List<DockerDfVolumeInfo>? Volumes { get; set; }

    [JsonPropertyName("BuildCache")]
    public List<DockerDfBuildCacheInfo>? BuildCache { get; set; }
}

public class DockerDfImageInfo
{
    [JsonPropertyName("Id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("RepoTags")]
    public List<string>? RepoTags { get; set; }

    [JsonPropertyName("Created")]
    public long Created { get; set; }

    [JsonPropertyName("Size")]
    public long Size { get; set; }

    [JsonPropertyName("SharedSize")]
    public long SharedSize { get; set; }

    [JsonPropertyName("Containers")]
    public int Containers { get; set; }
}

public class DockerDfContainerInfo
{
    [JsonPropertyName("Id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("Names")]
    public List<string>? Names { get; set; }

    [JsonPropertyName("Image")]
    public string? Image { get; set; }

    [JsonPropertyName("Command")]
    public string? Command { get; set; }

    [JsonPropertyName("Created")]
    public long Created { get; set; }

    [JsonPropertyName("State")]
    public string? State { get; set; }

    [JsonPropertyName("Status")]
    public string? Status { get; set; }

    [JsonPropertyName("SizeRw")]
    public long SizeRw { get; set; }

    [JsonPropertyName("SizeRootFs")]
    public long SizeRootFs { get; set; }
}

public class DockerDfVolumeInfo
{
    [JsonPropertyName("Name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("Driver")]
    public string? Driver { get; set; }

    [JsonPropertyName("Mountpoint")]
    public string? Mountpoint { get; set; }

    [JsonPropertyName("UsageData")]
    public DockerDfVolumeUsage? UsageData { get; set; }
}

public class DockerDfVolumeUsage
{
    [JsonPropertyName("Size")]
    public long Size { get; set; }

    [JsonPropertyName("RefCount")]
    public long RefCount { get; set; }
}

public class DockerDfBuildCacheInfo
{
    [JsonPropertyName("ID")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("Type")]
    public string? Type { get; set; }

    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    [JsonPropertyName("InUse")]
    public bool InUse { get; set; }

    [JsonPropertyName("Shared")]
    public bool Shared { get; set; }

    [JsonPropertyName("Size")]
    public long Size { get; set; }
}

public class DockerSelectivePruneRequest
{
    [JsonPropertyName("containerIds")]
    public List<string>? ContainerIds { get; set; }

    [JsonPropertyName("imageIds")]
    public List<string>? ImageIds { get; set; }

    [JsonPropertyName("volumeNames")]
    public List<string>? VolumeNames { get; set; }

    [JsonPropertyName("pruneBuildCache")]
    public bool PruneBuildCache { get; set; }
}

public class DockerSelectivePruneResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("totalSpaceReclaimed")]
    public long TotalSpaceReclaimed { get; set; }

    [JsonPropertyName("deletedContainers")]
    public List<string> DeletedContainers { get; set; } = [];

    [JsonPropertyName("deletedImages")]
    public List<string> DeletedImages { get; set; } = [];

    [JsonPropertyName("deletedVolumes")]
    public List<string> DeletedVolumes { get; set; } = [];

    [JsonPropertyName("buildCachePruned")]
    public bool BuildCachePruned { get; set; }

    [JsonPropertyName("errors")]
    public List<string> Errors { get; set; } = [];
}
