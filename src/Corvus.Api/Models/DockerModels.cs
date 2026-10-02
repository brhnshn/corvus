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

    [JsonPropertyName("Name")]
    public string? Name { get; set; }

    [JsonPropertyName("Config")]
    public DockerContainerConfig? Config { get; set; }

    [JsonPropertyName("State")]
    public DockerContainerState? State { get; set; }
}

public class DockerContainerConfig
{
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

    [JsonPropertyName("ExitCode")]
    public int ExitCode { get; set; }

    [JsonPropertyName("Health")]
    public DockerContainerHealth? Health { get; set; }
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
