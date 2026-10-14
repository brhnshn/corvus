using System.Text.Json.Serialization;

namespace Corvus.Api.Models.Systems;

public class SystemdUnitDto
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("loadState")]
    public string LoadState { get; set; } = string.Empty;

    [JsonPropertyName("activeState")]
    public string ActiveState { get; set; } = string.Empty;

    [JsonPropertyName("subState")]
    public string SubState { get; set; } = string.Empty;

    [JsonPropertyName("memoryBytes")]
    public long? MemoryBytes { get; set; }
}

public class SystemdActionRequest
{
    [JsonPropertyName("action")]
    public string Action { get; set; } = "restart";
}

public class SystemdLogsDto
{
    [JsonPropertyName("unit")]
    public string Unit { get; set; } = string.Empty;

    [JsonPropertyName("logs")]
    public List<string> Logs { get; set; } = [];
}
