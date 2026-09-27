namespace Corvus.Api.Models;

public class ServiceIncident
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = "info"; // 'info', 'warning', 'critical', 'maintenance'
    public bool IsPinned { get; set; } = true;
    public string Status { get; set; } = "investigating"; // 'investigating', 'identified', 'monitoring', 'resolved'
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    public string? ResolvedAt { get; set; }
}

public record CreateIncidentRequest(
    string Title,
    string Message,
    string? Severity = "info",
    bool? IsPinned = true,
    string? Status = "investigating"
);

public record UpdateIncidentRequest(
    string Title,
    string Message,
    string Severity,
    bool IsPinned,
    string Status
);

public record ServiceIncidentDto(
    string Id,
    string Title,
    string Message,
    string Severity,
    bool IsPinned,
    string Status,
    string CreatedAt,
    string? ResolvedAt
);
