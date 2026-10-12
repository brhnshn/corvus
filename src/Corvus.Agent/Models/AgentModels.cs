using System.Text.Json.Serialization;

namespace Corvus.Agent.Models;

public class SystemContainerCacheEntity
{
    public string SystemId { get; set; } = string.Empty;
    public string ContainerId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Image { get; set; }
    public string State { get; set; } = "unknown";
    public string? Status { get; set; }
    public double CpuPercent { get; set; }
    public long MemoryBytes { get; set; }
    public string PortsJson { get; set; } = "[]";
    public string UpdatedAt { get; set; } = string.Empty;
}

public record AgentTelemetryPayload(
    float CpuPercent,
    ushort CpuCores,
    long RamUsedBytes,
    long RamTotalBytes,
    long DiskUsedBytes,
    long DiskTotalBytes,
    long NetRxBytesSec,
    long NetTxBytesSec,
    float LoadAvg1m,
    float LoadAvg5m,
    float LoadAvg15m,
    List<SystemContainerCacheEntity>? Containers = null
);

public record DockerRpcRequest(
    string Action,
    string? ContainerId = null,
    int? TailLines = 100
);

public record DockerRpcResponse(
    bool Success,
    string? Message = null,
    List<string>? Logs = null
);

public record AgentTunnelMessage(
    string Type,
    string? CorrelationId,
    AgentTelemetryPayload? Telemetry,
    DockerRpcRequest? DockerReq = null,
    DockerRpcResponse? DockerRes = null,
    string? Error = null
);

[JsonSourceGenerationOptions(
    WriteIndented = false,
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(AgentTunnelMessage))]
[JsonSerializable(typeof(AgentTelemetryPayload))]
[JsonSerializable(typeof(DockerRpcRequest))]
[JsonSerializable(typeof(DockerRpcResponse))]
[JsonSerializable(typeof(SystemContainerCacheEntity))]
[JsonSerializable(typeof(List<SystemContainerCacheEntity>))]
public partial class AgentJsonSerializerContext : JsonSerializerContext
{
}
