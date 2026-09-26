namespace Corvus.Api.Models;

public class ServiceOverride
{
    public string ContainerId { get; set; } = string.Empty;
    public string? ServiceId { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Url { get; set; }
    public string? Icon { get; set; }
    public string? Category { get; set; }
    public string? HealthCheckUrl { get; set; }
    public string? CheckType { get; set; }
    public int? Port { get; set; }
    public bool? IsPublic { get; set; }
    public bool? IsUptimeEnabled { get; set; }
    public int? CheckInterval { get; set; }
    public int? MaxRetries { get; set; }
    public int? RetryInterval { get; set; }
    public int? TimeoutSeconds { get; set; }
    public bool? IgnoreTls { get; set; }
    public string? AcceptedStatusCodes { get; set; }
    public string? HttpMethod { get; set; }
}
