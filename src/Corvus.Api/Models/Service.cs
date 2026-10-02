namespace Corvus.Api.Models;

public class Service
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Source { get; set; } = "manual"; // 'docker' | 'manual'
    public string? ContainerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Url { get; set; }
    public string? Icon { get; set; }
    public string? Category { get; set; }
    public string? HealthCheckUrl { get; set; }
    public string Status { get; set; } = "unknown"; // 'healthy' | 'degraded' | 'down' | 'unknown'
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");

    public string CheckType { get; set; } = "http"; // 'http' | 'tcp' | 'ping' | 'docker' | 'none'
    public int? Port { get; set; }
    public int? SslExpiryDays { get; set; }
    public string? SslIssuer { get; set; }
    public bool IsPublic { get; set; } = false;
    public bool IsUptimeEnabled { get; set; } = false;
    public int DisplayOrder { get; set; } = 0;

    public int? CheckInterval { get; set; } = 60;
    public int? MaxRetries { get; set; } = 1;
    public int? RetryInterval { get; set; } = 30;
    public int? TimeoutSeconds { get; set; } = 5;
    public bool IgnoreTls { get; set; } = false;
    public string? AcceptedStatusCodes { get; set; } = "200-299";
    public string? HttpMethod { get; set; } = "GET";
}
