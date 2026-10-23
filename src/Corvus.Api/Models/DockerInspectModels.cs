using System.Text.Json;
using System.Text.Json.Serialization;

namespace Corvus.Api.Models;

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

    [JsonPropertyName("MemorySwap")]
    public long MemorySwap { get; set; }

    [JsonPropertyName("MemoryReservation")]
    public long MemoryReservation { get; set; }

    [JsonPropertyName("CpuLimitCores")]
    public double CpuLimitCores => NanoCpus > 0 ? (double)NanoCpus / 1_000_000_000.0 : 0;

    [JsonPropertyName("MemoryLimitMb")]
    public long MemoryLimitMb => Memory > 0 ? Memory / (1024 * 1024) : 0;

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

public class DockerContainerHealth
{
    [JsonPropertyName("Status")]
    public string? Status { get; set; }
}
