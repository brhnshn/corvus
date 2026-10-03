using System.Text.Json;
using System.Text.Json.Serialization;

namespace Corvus.Api.Models;

public class DockerContainerInfo
{
    [JsonPropertyName("Id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("Names")]
    public List<string>? Names { get; set; }

    [JsonPropertyName("Image")]
    public string Image { get; set; } = string.Empty;

    [JsonPropertyName("State")]
    public string State { get; set; } = string.Empty;

    [JsonPropertyName("Status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("Created")]
    public long Created { get; set; }

    [JsonPropertyName("Ports")]
    public List<DockerPortInfo>? Ports { get; set; }

    [JsonPropertyName("Labels")]
    public Dictionary<string, string>? Labels { get; set; }

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();
}

public class DockerPortInfo
{
    [JsonPropertyName("IP")]
    public string? IP { get; set; }

    [JsonPropertyName("PrivatePort")]
    public int PrivatePort { get; set; }

    [JsonPropertyName("PublicPort")]
    public int? PublicPort { get; set; }

    [JsonPropertyName("Type")]
    public string? Type { get; set; }
}

public class DockerVersionInfo
{
    [JsonPropertyName("Version")]
    public string? Version { get; set; }

    [JsonPropertyName("ApiVersion")]
    public string? ApiVersion { get; set; }

    [JsonPropertyName("Os")]
    public string? Os { get; set; }

    [JsonPropertyName("Arch")]
    public string? Arch { get; set; }
}

public class DockerContainerInspectInfo
{
    [JsonPropertyName("Id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("Created")]
    public string? Created { get; set; }

    [JsonPropertyName("Path")]
    public string? Path { get; set; }

    [JsonPropertyName("Args")]
    public List<string>? Args { get; set; }

    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("Image")]
    public string? Image { get; set; }

    [JsonPropertyName("Config")]
    public DockerContainerConfig? Config { get; set; }

    [JsonPropertyName("State")]
    public DockerContainerState? State { get; set; }

    [JsonPropertyName("HostConfig")]
    public DockerHostConfig? HostConfig { get; set; }

    [JsonPropertyName("NetworkSettings")]
    public DockerNetworkSettings? NetworkSettings { get; set; }

    [JsonPropertyName("Mounts")]
    public List<DockerMountInfo>? Mounts { get; set; }
}

public class DockerContainerConfig
{
    [JsonPropertyName("Image")]
    public string? Image { get; set; }

    [JsonPropertyName("Cmd")]
    public List<string>? Cmd { get; set; }

    [JsonPropertyName("Entrypoint")]
    public List<string>? Entrypoint { get; set; }

    [JsonPropertyName("WorkingDir")]
    public string? WorkingDir { get; set; }

    [JsonPropertyName("User")]
    public string? User { get; set; }

    [JsonPropertyName("Env")]
    public List<string>? Env { get; set; }

    [JsonPropertyName("Labels")]
    public Dictionary<string, string>? Labels { get; set; }
}

public class DockerContainerState
{
    [JsonPropertyName("Status")]
    public string? Status { get; set; }

    [JsonPropertyName("Running")]
    public bool Running { get; set; }

    [JsonPropertyName("Paused")]
    public bool Paused { get; set; }

    [JsonPropertyName("Restarting")]
    public bool Restarting { get; set; }

    [JsonPropertyName("OOMKilled")]
    public bool OOMKilled { get; set; }

    [JsonPropertyName("Dead")]
    public bool Dead { get; set; }

    [JsonPropertyName("Pid")]
    public int Pid { get; set; }

    [JsonPropertyName("ExitCode")]
    public int ExitCode { get; set; }

    [JsonPropertyName("Error")]
    public string? Error { get; set; }

    [JsonPropertyName("StartedAt")]
    public string? StartedAt { get; set; }

    [JsonPropertyName("FinishedAt")]
    public string? FinishedAt { get; set; }

    [JsonPropertyName("Health")]
    public DockerContainerHealth? Health { get; set; }
}

public class DockerHostConfig
{
    [JsonPropertyName("RestartPolicy")]
    public DockerRestartPolicy? RestartPolicy { get; set; }

    [JsonPropertyName("Memory")]
    public long Memory { get; set; }

    [JsonPropertyName("NanoCpus")]
    public long NanoCpus { get; set; }

    [JsonPropertyName("CpuShares")]
    public long CpuShares { get; set; }

    [JsonPropertyName("NetworkMode")]
    public string? NetworkMode { get; set; }

    [JsonPropertyName("Binds")]
    public List<string>? Binds { get; set; }

    [JsonPropertyName("PortBindings")]
    public Dictionary<string, List<DockerPortBindingHost>?>? PortBindings { get; set; }
}

public class DockerPortBindingHost
{
    [JsonPropertyName("HostIp")]
    public string? HostIp { get; set; }

    [JsonPropertyName("HostPort")]
    public string? HostPort { get; set; }
}

public class DockerRestartPolicy
{
    [JsonPropertyName("Name")]
    public string Name { get; set; } = "no";

    [JsonPropertyName("MaximumRetryCount")]
    public int MaximumRetryCount { get; set; }
}

public class DockerNetworkSettings
{
    [JsonPropertyName("IPAddress")]
    public string? IPAddress { get; set; }

    [JsonPropertyName("Gateway")]
    public string? Gateway { get; set; }

    [JsonPropertyName("MacAddress")]
    public string? MacAddress { get; set; }

    [JsonPropertyName("Ports")]
    public Dictionary<string, List<DockerPortBindingHost>?>? Ports { get; set; }

    [JsonPropertyName("Networks")]
    public Dictionary<string, DockerEndpointSettings>? Networks { get; set; }
}

public class DockerEndpointSettings
{
    [JsonPropertyName("IPAddress")]
    public string? IPAddress { get; set; }

    [JsonPropertyName("Gateway")]
    public string? Gateway { get; set; }

    [JsonPropertyName("MacAddress")]
    public string? MacAddress { get; set; }

    [JsonPropertyName("NetworkID")]
    public string? NetworkID { get; set; }
}

public class DockerMountInfo
{
    [JsonPropertyName("Type")]
    public string? Type { get; set; }

    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("Source")]
    public string? Source { get; set; }

    [JsonPropertyName("Destination")]
    public string? Destination { get; set; }

    [JsonPropertyName("Mode")]
    public string? Mode { get; set; }

    [JsonPropertyName("RW")]
    public bool RW { get; set; }

    [JsonPropertyName("Propagation")]
    public string? Propagation { get; set; }
}

public class DockerContainerUpdateRequest
{
    [JsonPropertyName("NanoCpus")]
    public long? NanoCpus { get; set; }

    [JsonPropertyName("Memory")]
    public long? Memory { get; set; }

    [JsonPropertyName("MemoryReservation")]
    public long? MemoryReservation { get; set; }

    [JsonPropertyName("RestartPolicy")]
    public DockerRestartPolicy? RestartPolicy { get; set; }
}

public class DockerContainerHealth
{
    [JsonPropertyName("Status")]
    public string? Status { get; set; }
}

public class DockerExecCreateResponse
{
    [JsonPropertyName("Id")]
    public string? Id { get; set; }
}

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
