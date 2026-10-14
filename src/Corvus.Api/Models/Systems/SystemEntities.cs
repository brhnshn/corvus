namespace Corvus.Api.Models.Systems;

public class SystemEntity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Hostname { get; set; }
    public string? IpAddress { get; set; }
    public string? OsInfo { get; set; }
    public string? AgentVersion { get; set; }
    public string TagsJson { get; set; } = "[]";
    public string Status { get; set; } = "offline";
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public string? LastSeenAt { get; set; }
}

public class SystemTokenEntity
{
    public string Id { get; set; } = string.Empty;
    public string SystemId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public string TokenPrefix { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string? ExpiresAt { get; set; }
    public int IsRevoked { get; set; }
    public string? RevokedAt { get; set; }
}

public class SystemMetric1mEntity
{
    public long Id { get; set; }
    public string SystemId { get; set; } = string.Empty;
    public string RecordedAt { get; set; } = string.Empty;
    public double CpuPercent { get; set; }
    public int CpuCores { get; set; } = 1;
    public long RamUsedBytes { get; set; }
    public long RamTotalBytes { get; set; }
    public long DiskUsedBytes { get; set; }
    public long DiskTotalBytes { get; set; }
    public long NetworkRxBytesSec { get; set; }
    public long NetworkTxBytesSec { get; set; }
    public double? LoadAvg1m { get; set; }
    public double? LoadAvg5m { get; set; }
    public double? LoadAvg15m { get; set; }
}

public class SystemMetric1hEntity
{
    public long Id { get; set; }
    public string SystemId { get; set; } = string.Empty;
    public string RecordedAt { get; set; } = string.Empty;
    public double CpuAvg { get; set; }
    public double CpuMax { get; set; }
    public long RamUsedAvg { get; set; }
    public long DiskUsedAvg { get; set; }
    public long NetworkRxTotal { get; set; }
    public long NetworkTxTotal { get; set; }
}

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

public record SystemStatusDto(
    string Engine,
    bool IsWalMode,
    int RetentionDays,
    int TotalSystems,
    int OnlineSystems,
    int DegradedSystems,
    int OfflineSystems,
    long BufferMemoryBytes,
    string ServerTimeUtc
);

public record CreateSystemRequest(
    string Name,
    string? Environment = "production",
    List<string>? Tags = null,
    string? Notes = null
);

public record UpdateSystemRequest(
    string? Name = null,
    List<string>? Tags = null,
    string? Status = null
);

public record CreateSystemResponse(
    SystemEntity System,
    string NodeKey,
    string HubUrl
);

public record SystemSummaryDto(
    string Id,
    string Name,
    string? Hostname,
    string? IpAddress,
    string? OsInfo,
    string? AgentVersion,
    List<string> Tags,
    string Status,
    string CreatedAt,
    string? LastSeenAt,
    float? CurrentCpuPercent,
    long? CurrentRamUsedBytes,
    long? CurrentRamTotalBytes,
    long? CurrentDiskUsedBytes,
    long? CurrentDiskTotalBytes,
    int ActiveContainerCount,
    long? LastPingMs,
    float? LoadAvg1m = null,
    float? LoadAvg5m = null,
    float? LoadAvg15m = null,
    long? NetRxBytesSec = null,
    long? NetTxBytesSec = null
);

public record SystemDetailDto(
    SystemEntity System,
    List<string> Tags,
    SystemTelemetryPoint? LatestPoint,
    List<SystemContainerCacheEntity> Containers,
    int TotalContainers,
    int RunningContainers
);

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
    int? TailLines = 100,
    string? ProjectName = null,
    string? FileContent = null,
    string? EnvContent = null
);

public record DockerRpcResponse(
    bool Success,
    string? Message = null,
    List<string>? Logs = null
);

public record SystemDownsampledPoint(
    string Timestamp,
    double CpuPercent,
    long RamUsedBytes,
    long DiskUsedBytes,
    long RxBytesPerSec,
    long TxBytesPerSec
);

public record AgentTunnelMessage(
    string Type,
    string? CorrelationId,
    AgentTelemetryPayload? Telemetry,
    DockerRpcRequest? DockerReq = null,
    DockerRpcResponse? DockerRes = null,
    string? Error = null
);
