using System.Text.Json;
using System.Text.Json.Serialization;

namespace Corvus.Api.Models;

public class DockerContainerUpdateRequest
{
    [JsonPropertyName("NanoCpus")]
    public long? NanoCpus { get; set; }

    [JsonPropertyName("Memory")]
    public long? Memory { get; set; }

    [JsonPropertyName("MemorySwap")]
    public long? MemorySwap { get; set; }

    [JsonPropertyName("MemoryReservation")]
    public long? MemoryReservation { get; set; }

    [JsonPropertyName("RestartPolicy")]
    public DockerRestartPolicy? RestartPolicy { get; set; }
}

public class ContainerResourceUpdateRequest
{
    [JsonPropertyName("cpuCores")]
    public double? CpuCores { get; set; }

    [JsonPropertyName("memoryMb")]
    public long? MemoryMb { get; set; }

    [JsonPropertyName("memorySwapMb")]
    public long? MemorySwapMb { get; set; }

    [JsonPropertyName("restartPolicy")]
    public string? RestartPolicy { get; set; }

    [JsonPropertyName("maximumRetryCount")]
    public int? MaximumRetryCount { get; set; }
}

public class DockerExecCreateResponse
{
    [JsonPropertyName("Id")]
    public string? Id { get; set; }
}

public class DockerContainerCreateRequest
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

    [JsonPropertyName("HostConfig")]
    public DockerHostConfig? HostConfig { get; set; }

    [JsonPropertyName("NetworkingConfig")]
    public DockerNetworkingConfigRequest? NetworkingConfig { get; set; }
}

public class DockerNetworkingConfigRequest
{
    [JsonPropertyName("EndpointsConfig")]
    public Dictionary<string, DockerEndpointSettings>? EndpointsConfig { get; set; }
}

public class DockerContainerCreateResponse
{
    [JsonPropertyName("Id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("Warnings")]
    public List<string>? Warnings { get; set; }
}
