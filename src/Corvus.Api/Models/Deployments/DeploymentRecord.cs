namespace Corvus.Api.Models.Deployments;

public class DeploymentRecord
{
    public string Id { get; set; } = string.Empty;
    public string TargetType { get; set; } = "container";
    public string TargetId { get; set; } = string.Empty;
    public string TargetName { get; set; } = string.Empty;
    public string TriggerType { get; set; } = "manual_ui";
    public string TriggeredBy { get; set; } = "user";
    public string Status { get; set; } = "pending";
    public string CurrentStep { get; set; } = "queued";
    public string ImageName { get; set; } = string.Empty;
    public string? OldDigest { get; set; }
    public string? NewDigest { get; set; }
    public long DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
    public string? LogOutput { get; set; }
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    public string? CompletedAt { get; set; }
}

public record DeploymentTriggerResponse(
    string DeploymentId,
    string TargetId,
    string Status,
    string Message
);

public record DeploymentStepChangedEventPayload(
    string Type,
    string DeploymentId,
    string Step,
    string Timestamp
);

public record DeploymentLogChunkEventPayload(
    string Type,
    string DeploymentId,
    string Chunk,
    string Timestamp
);

public record DeploymentCompletedEventPayload(
    string Type,
    string DeploymentId,
    string Status,
    long DurationMs,
    string? NewDigest,
    string? Error,
    string Timestamp
);

public record DeploymentStartedGlobalPayload(
    string DeploymentId,
    string TargetId,
    string TargetName,
    string TriggerType,
    string TriggeredBy,
    string ImageName
);

public record DeploymentErrorResponse(
    string Message
);

public record ScratchDeploymentRequest(
    string Image,
    string ContainerName,
    string? Ports = null,
    string? Env = null,
    string? RestartPolicy = "unless-stopped",
    string? Network = null
);

public record ContainerConnectionTestResult(
    string ContainerId,
    string Name,
    bool IsRunning,
    string Status,
    string? HealthStatus,
    string? IpAddress,
    List<string> ExposedPorts,
    bool CanConnect,
    string Message
);

public record DeployWebhookInfoResponse(
    string Token
);
