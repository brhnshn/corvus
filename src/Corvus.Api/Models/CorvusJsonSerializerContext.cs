using System.Text.Json.Serialization;

namespace Corvus.Api.Models;

public record DashboardSummaryDto(
    int TotalServices,
    int HealthyServices,
    int DegradedServices,
    int DownServices,
    int TotalContainers,
    int RunningContainers,
    BackupEvent? LastBackup,
    SystemMetric? LatestMetrics
);

public record CreateServiceRequest(
    string Name,
    string? Description,
    string? Url,
    string? Icon,
    string? Category,
    string? HealthCheckUrl,
    string? CheckType = "http",
    int? Port = null,
    bool? IsPublic = false,
    int? CheckInterval = 60,
    int? MaxRetries = 1,
    int? RetryInterval = 30,
    int? TimeoutSeconds = 5,
    bool? IgnoreTls = false,
    string? AcceptedStatusCodes = "200-299",
    string? HttpMethod = "GET"
);

public record UpdateServiceRequest(
    string Name,
    string? Description,
    string? Url,
    string? Icon,
    string? Category,
    string? HealthCheckUrl,
    string? CheckType = null,
    int? Port = null,
    bool? IsPublic = null,
    int? CheckInterval = null,
    int? MaxRetries = null,
    int? RetryInterval = null,
    int? TimeoutSeconds = null,
    bool? IgnoreTls = null,
    string? AcceptedStatusCodes = null,
    string? HttpMethod = null
);

public record ContainerStatsDto(
    string ContainerId,
    double CpuPercent,
    long MemoryUsageBytes,
    long MemoryLimitBytes,
    double MemoryPercent,
    long NetworkRxBytes,
    long NetworkTxBytes
);

public record CreatePushMonitorRequest(
    string Name,
    string? Token,
    int ExpectedIntervalMinutes = 1440,
    int GracePeriodMinutes = 60
);

public record UpdatePushMonitorRequest(
    string Name,
    int ExpectedIntervalMinutes,
    int GracePeriodMinutes
);

public record ReorderServicesRequest(
    List<string> ServiceIds
);

public record PublicServiceDto(
    string Id,
    string Name,
    string? Description,
    string? Url,
    string? Icon,
    string? Category,
    string Status,
    int? SslExpiryDays,
    double UptimePercentage,
    List<UptimeCheck> RecentChecks
);

public record PublicStatusPageDto(
    string SystemStatus,
    List<PublicServiceDto> Services,
    string GeneratedAt,
    bool Enabled = true,
    string? Message = null
);

public record ServerEventDto(
    string EventType,
    string PayloadJson,
    string Timestamp
);

public record PushBackupRequest(
    string Status,
    long? SizeBytes,
    string? Message
);

public record AuthLoginRequest(
    string Username,
    string Password
);

public record AuthRegisterRequest(
    string Username,
    string Password
);

public record ToggleRegistrationRequest(
    bool Enabled
);

public record AuthStatusResponse(
    bool AuthEnabled,
    bool IsAuthenticated,
    string? Username,
    bool HasUsers,
    bool RegistrationEnabled
);

public record GenericApiResponse(
    bool Success,
    string? Message
);

public record ContainerLogsDto(
    string ContainerId,
    List<string> Lines
);

public record TestNotificationRequest(
    string Channel,
    string? WebhookUrl,
    string? BotToken,
    string? ChatId
);

public record NotificationResult(
    bool Success,
    string Message
);

[JsonSourceGenerationOptions(
    WriteIndented = false,
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull)]
[JsonSerializable(typeof(DockerContainerInfo))]
[JsonSerializable(typeof(List<DockerContainerInfo>))]
[JsonSerializable(typeof(DockerPortInfo))]
[JsonSerializable(typeof(List<DockerPortInfo>))]
[JsonSerializable(typeof(DockerVersionInfo))]
[JsonSerializable(typeof(DockerContainerInspectInfo))]
[JsonSerializable(typeof(DockerContainerConfig))]
[JsonSerializable(typeof(DockerContainerState))]
[JsonSerializable(typeof(DockerContainerHealth))]
[JsonSerializable(typeof(Service))]
[JsonSerializable(typeof(List<Service>))]
[JsonSerializable(typeof(ServiceOverride))]
[JsonSerializable(typeof(List<ServiceOverride>))]
[JsonSerializable(typeof(SystemMetric))]
[JsonSerializable(typeof(List<SystemMetric>))]
[JsonSerializable(typeof(UptimeCheck))]
[JsonSerializable(typeof(List<UptimeCheck>))]
[JsonSerializable(typeof(BackupEvent))]
[JsonSerializable(typeof(List<BackupEvent>))]
[JsonSerializable(typeof(PushMonitor))]
[JsonSerializable(typeof(List<PushMonitor>))]
[JsonSerializable(typeof(DashboardSummaryDto))]
[JsonSerializable(typeof(CreateServiceRequest))]
[JsonSerializable(typeof(UpdateServiceRequest))]
[JsonSerializable(typeof(PushBackupRequest))]
[JsonSerializable(typeof(AuthLoginRequest))]
[JsonSerializable(typeof(AuthRegisterRequest))]
[JsonSerializable(typeof(ToggleRegistrationRequest))]
[JsonSerializable(typeof(AuthStatusResponse))]
[JsonSerializable(typeof(GenericApiResponse))]
[JsonSerializable(typeof(Dictionary<string, string>))]
[JsonSerializable(typeof(ContainerLogsDto))]
[JsonSerializable(typeof(TestNotificationRequest))]
[JsonSerializable(typeof(NotificationResult))]
[JsonSerializable(typeof(ContainerStatsDto))]
[JsonSerializable(typeof(Dictionary<string, ContainerStatsDto>))]
[JsonSerializable(typeof(CreatePushMonitorRequest))]
[JsonSerializable(typeof(UpdatePushMonitorRequest))]
[JsonSerializable(typeof(ReorderServicesRequest))]
[JsonSerializable(typeof(PublicServiceDto))]
[JsonSerializable(typeof(PublicStatusPageDto))]
[JsonSerializable(typeof(ServerEventDto))]
[JsonSerializable(typeof(VersionInfoDto))]
[JsonSerializable(typeof(GitHubReleaseDto))]
[JsonSerializable(typeof(DbStatsResponse))]
[JsonSerializable(typeof(string))]
public partial class CorvusJsonSerializerContext : JsonSerializerContext
{
}
