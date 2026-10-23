using Dapper;
using System.Data.Common;
using Corvus.Api.Models;

namespace Corvus.Api.Data;

// Veritabanı satırı ↔ Service modeli eşleme ve etiket (tags) ayrıştırma yardımcıları
public partial class ServicesRepository
{
    public class ServiceDbRow
    {
        public string id { get; set; } = string.Empty;
        public string source { get; set; } = string.Empty;
        public string? container_id { get; set; }
        public string? system_id { get; set; }
        public string name { get; set; } = string.Empty;
        public string? description { get; set; }
        public string? url { get; set; }
        public string? icon { get; set; }
        public string? category { get; set; }
        public string? health_check_url { get; set; }
        public string status { get; set; } = string.Empty;
        public string created_at { get; set; } = string.Empty;
        public string updated_at { get; set; } = string.Empty;
        public string? check_type { get; set; }
        public int? port { get; set; }
        public int? ssl_expiry_days { get; set; }
        public string? ssl_issuer { get; set; }
        public int? is_public { get; set; }
        public int? is_uptime_enabled { get; set; }
        public int? display_order { get; set; }
        public int? check_interval { get; set; }
        public int? max_retries { get; set; }
        public int? retry_interval { get; set; }
        public int? timeout_seconds { get; set; }
        public int? ignore_tls { get; set; }
        public string? accepted_status_codes { get; set; }
        public string? http_method { get; set; }
        public string? expected_body { get; set; }
        public string? tags { get; set; }
        public string? OverrideName { get; set; }
        public string? OverrideDescription { get; set; }
        public string? OverrideUrl { get; set; }
        public string? OverrideIcon { get; set; }
        public string? OverrideCategory { get; set; }
        public string? OverrideHealthCheckUrl { get; set; }
        public string? OverrideCheckType { get; set; }
        public int? OverridePort { get; set; }
        public int? OverrideIsPublic { get; set; }
        public int? OverrideIsUptimeEnabled { get; set; }
        public int? OverrideCheckInterval { get; set; }
        public int? OverrideMaxRetries { get; set; }
        public int? OverrideRetryInterval { get; set; }
        public int? OverrideTimeoutSeconds { get; set; }
        public int? OverrideIgnoreTls { get; set; }
        public string? OverrideAcceptedStatusCodes { get; set; }
        public string? OverrideHttpMethod { get; set; }
        public string? OverrideExpectedBody { get; set; }
        public string? OverrideTags { get; set; }
    }

    public static List<string> ParseTags(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<string>();
        raw = raw.Trim();
        if (raw.StartsWith('[') && raw.EndsWith(']'))
        {
            try
            {
                var list = System.Text.Json.JsonSerializer.Deserialize(raw, CorvusJsonSerializerContext.Default.ListString);
                if (list != null)
                {
                    return list.Where(t => !string.IsNullOrWhiteSpace(t))
                               .Select(t => t.Trim())
                               .Distinct(StringComparer.OrdinalIgnoreCase)
                               .ToList();
                }
            }
            catch
            {
                // Fallback to comma separated
            }
        }

        return raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                  .Distinct(StringComparer.OrdinalIgnoreCase)
                  .ToList();
    }

    public static string SerializeTags(List<string>? tags)
    {
        if (tags == null || tags.Count == 0) return "[]";
        var clean = tags.Where(t => !string.IsNullOrWhiteSpace(t))
                        .Select(t => t.Trim())
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();
        return System.Text.Json.JsonSerializer.Serialize(clean, CorvusJsonSerializerContext.Default.ListString);
    }

    private static Service MapReaderToService(DbDataReader r)
    {
        string GetStr(string col, string def = "")
        {
            int ord = r.GetOrdinal(col);
            return r.IsDBNull(ord) ? def : r.GetString(ord);
        }

        string? GetNullableStr(string col)
        {
            int ord = r.GetOrdinal(col);
            return r.IsDBNull(ord) ? null : r.GetString(ord);
        }

        int? GetNullableInt(string col)
        {
            int ord = r.GetOrdinal(col);
            return r.IsDBNull(ord) ? null : Convert.ToInt32(r.GetValue(ord));
        }

        var overrideName = GetNullableStr("OverrideName");
        var overrideDescription = GetNullableStr("OverrideDescription");
        var overrideUrl = GetNullableStr("OverrideUrl");
        var overrideIcon = GetNullableStr("OverrideIcon");
        var overrideCategory = GetNullableStr("OverrideCategory");
        var overrideHealthCheckUrl = GetNullableStr("OverrideHealthCheckUrl");
        var overrideCheckType = GetNullableStr("OverrideCheckType");
        var overridePort = GetNullableInt("OverridePort");
        var overrideIsPublic = GetNullableInt("OverrideIsPublic");
        var overrideIsUptimeEnabled = GetNullableInt("OverrideIsUptimeEnabled");
        var overrideCheckInterval = GetNullableInt("OverrideCheckInterval");
        var overrideMaxRetries = GetNullableInt("OverrideMaxRetries");
        var overrideRetryInterval = GetNullableInt("OverrideRetryInterval");
        var overrideTimeoutSeconds = GetNullableInt("OverrideTimeoutSeconds");
        var overrideIgnoreTls = GetNullableInt("OverrideIgnoreTls");
        var overrideAcceptedStatusCodes = GetNullableStr("OverrideAcceptedStatusCodes");
        var overrideHttpMethod = GetNullableStr("OverrideHttpMethod");
        var overrideExpectedBody = GetNullableStr("OverrideExpectedBody");
        var overrideTags = GetNullableStr("OverrideTags");

        var tagsRaw = overrideTags ?? GetNullableStr("tags");

        return new Service
        {
            Id = GetStr("id"),
            Source = GetStr("source"),
            ContainerId = GetNullableStr("container_id"),
            SystemId = GetNullableStr("system_id") ?? "local-host",
            Name = overrideName ?? GetStr("name"),
            Description = overrideDescription ?? GetNullableStr("description"),
            Url = overrideUrl ?? GetNullableStr("url"),
            Icon = overrideIcon ?? GetNullableStr("icon"),
            Category = overrideCategory ?? GetNullableStr("category"),
            HealthCheckUrl = overrideHealthCheckUrl ?? GetNullableStr("health_check_url"),
            Status = GetStr("status"),
            CreatedAt = GetStr("created_at"),
            UpdatedAt = GetStr("updated_at"),
            CheckType = overrideCheckType ?? GetNullableStr("check_type") ?? "http",
            Port = overridePort ?? GetNullableInt("port"),
            SslExpiryDays = GetNullableInt("ssl_expiry_days"),
            SslIssuer = GetNullableStr("ssl_issuer"),
            IsPublic = (overrideIsPublic ?? GetNullableInt("is_public") ?? 0) == 1,
            IsUptimeEnabled = (overrideIsUptimeEnabled ?? GetNullableInt("is_uptime_enabled") ?? 0) == 1,
            DisplayOrder = GetNullableInt("display_order") ?? 0,
            CheckInterval = overrideCheckInterval ?? GetNullableInt("check_interval") ?? 60,
            MaxRetries = overrideMaxRetries ?? GetNullableInt("max_retries") ?? 1,
            RetryInterval = overrideRetryInterval ?? GetNullableInt("retry_interval") ?? 30,
            TimeoutSeconds = overrideTimeoutSeconds ?? GetNullableInt("timeout_seconds") ?? 5,
            IgnoreTls = (overrideIgnoreTls ?? GetNullableInt("ignore_tls") ?? 0) == 1,
            AcceptedStatusCodes = overrideAcceptedStatusCodes ?? GetNullableStr("accepted_status_codes") ?? "200-299",
            HttpMethod = overrideHttpMethod ?? GetNullableStr("http_method") ?? "GET",
            ExpectedBody = overrideExpectedBody ?? GetNullableStr("expected_body"),
            Tags = ParseTags(tagsRaw)
        };
    }
}
