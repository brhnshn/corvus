namespace Corvus.Api.Models;

public class UptimeCheck
{
    public long Id { get; set; }
    public string ServiceId { get; set; } = string.Empty;
    public string CheckedAt { get; set; } = DateTime.UtcNow.ToString("o");
    public string Status { get; set; } = "up"; // 'up' | 'down'
    public int? ResponseTimeMs { get; set; }
    public string? ErrorMessage { get; set; }
    public bool IsTransition { get; set; }
}

public record DailyUptimeStat(
    string ServiceId,
    string Date,
    int TotalChecks,
    int UpChecks,
    int? AvgResponseTimeMs
);
