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

    [JsonPropertyName("NetworkSettings")]
    public DockerNetworkSettings? NetworkSettings { get; set; }

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
