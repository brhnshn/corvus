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
