namespace Corvus.Api.Models;

public class ActivityLogEntry
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ActorUsername { get; set; } = "system";
    public string ActionType { get; set; } = string.Empty;
    public string Category { get; set; } = "system"; // container, service, security, alert, system
    public string TargetResource { get; set; } = string.Empty;
    public string? DetailsJson { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ActivityLogFilterQuery
{
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 50;
    public string? Category { get; set; }
    public string? ActionType { get; set; }
    public string? Search { get; set; }
}

public class ActivityLogPagedResult
{
    public List<ActivityLogEntry> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
}
