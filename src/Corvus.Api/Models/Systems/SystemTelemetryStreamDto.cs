namespace Corvus.Api.Models.Systems;

/// <summary>
/// Server-Sent Events (SSE) ile istemcilere anlik aktarilan canli telemetri paketi.
/// AOT ve System.Text.Json ile tam uyumlu record DTO.
/// </summary>
public record SystemTelemetryStreamDto(
    string SystemId,
    long TimestampUnixSeconds,
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
    int ActiveContainers
);
