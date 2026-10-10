namespace Corvus.Api.Models;

public class AlertRule
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string TargetType { get; set; } = "system"; // system, container
    public string? TargetId { get; set; }
    public string Metric { get; set; } = "cpu"; // cpu, memory, disk
    public string Operator { get; set; } = "gt"; // gt (>), lt (<)
    public double ThresholdValue { get; set; }
    public int DurationSeconds { get; set; } = 60;
    public int CooldownMinutes { get; set; } = 30;
    public bool IsEnabled { get; set; } = true;
    public bool IsFiring { get; set; } = false;
    public DateTime? ViolationStartAt { get; set; }
    public DateTime? LastTriggeredAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateAlertRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string TargetType { get; set; } = "system";
    public string? TargetId { get; set; }
    public string Metric { get; set; } = "cpu";
    public string Operator { get; set; } = "gt";
    public double ThresholdValue { get; set; }
    public int DurationSeconds { get; set; } = 60;
    public int CooldownMinutes { get; set; } = 30;
    public bool IsEnabled { get; set; } = true;
}

public class UpdateAlertRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string TargetType { get; set; } = "system";
    public string? TargetId { get; set; }
    public string Metric { get; set; } = "cpu";
    public string Operator { get; set; } = "gt";
    public double ThresholdValue { get; set; }
    public int DurationSeconds { get; set; } = 60;
    public int CooldownMinutes { get; set; } = 30;
    public bool IsEnabled { get; set; } = true;
}
