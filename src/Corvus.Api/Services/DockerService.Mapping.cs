using System.Collections.Concurrent;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public partial class DockerService
{
    public bool ShouldIgnoreContainer(DockerContainerInfo container)
    {
        var labels = container.Labels ?? new Dictionary<string, string>();
        if (labels.TryGetValue("corvus.ignore", out var val) && string.Equals(val, "true", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }

    public static string? ExtractDomainFromLabels(IReadOnlyDictionary<string, string> labels, IEnumerable<string>? env = null)
    {
        // 0. Corvus doğrudan etiketleri
        if (labels.TryGetValue("corvus.url", out var cUrl) && !string.IsNullOrWhiteSpace(cUrl))
        {
            return cUrl.Trim();
        }
        if (labels.TryGetValue("corvus.domain", out var cDomain) && !string.IsNullOrWhiteSpace(cDomain))
        {
            var d = cDomain.Trim();
            return d.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? d : $"https://{d}";
        }

        // 1. Traefik Router Host rule (örn: "Host(`app.example.com`)" veya "Host(`api.example.com`, `admin.example.com`)" veya "Host('app.example.com')")
        foreach (var kvp in labels)
        {
            if (kvp.Key.StartsWith("traefik.http.routers.", StringComparison.OrdinalIgnoreCase) &&
                kvp.Key.EndsWith(".rule", StringComparison.OrdinalIgnoreCase))
            {
                var match = System.Text.RegularExpressions.Regex.Match(
                    kvp.Value, 
                    @"Host\s*\(\s*[`'""]?(?<domain>[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[`'""]?", 
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                if (match.Success)
                {
                    string domain = match.Groups["domain"].Value.Trim();
                    if (!string.IsNullOrWhiteSpace(domain))
                    {
                        return $"https://{domain}";
                    }
                }
            }

            if (kvp.Key.Equals("traefik.frontend.rule", StringComparison.OrdinalIgnoreCase))
            {
                var match = System.Text.RegularExpressions.Regex.Match(
                    kvp.Value, 
                    @"Host:\s*(?<domain>[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", 
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                if (match.Success)
                {
                    return $"https://{match.Groups["domain"].Value.Trim()}";
                }
            }
        }

        // 2. Caddy etiketleri (örn: caddy="example.com" veya caddy_0="example.com" veya caddy.reverse_proxy)
        foreach (var kvp in labels)
        {
            if (kvp.Key.StartsWith("caddy", StringComparison.OrdinalIgnoreCase))
            {
                var val = kvp.Value.Trim().Split(' ', ',')[0].Trim('`', '"', '\'');
                if (!string.IsNullOrWhiteSpace(val) && (val.Contains('.') || val.StartsWith("http", StringComparison.OrdinalIgnoreCase)))
                {
                    return val.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? val : $"https://{val}";
                }
            }
        }

        // 3. Virtual Host & Let's Encrypt etiketleri (Nginx proxy / Docker-gen: VIRTUAL_HOST=app.example.com)
        if (labels.TryGetValue("VIRTUAL_HOST", out var vHost) && !string.IsNullOrWhiteSpace(vHost))
        {
            string host = vHost.Trim().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(host))
            {
                return host.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? host : $"https://{host}";
            }
        }
        if (labels.TryGetValue("LETSENCRYPT_HOST", out var leHost) && !string.IsNullOrWhiteSpace(leHost))
        {
            string host = leHost.Trim().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(host))
            {
                return host.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? host : $"https://{host}";
            }
        }

        // 4. Coolify FQDN (coolify.fqdn=https://app.example.com)
        if (labels.TryGetValue("coolify.fqdn", out var coolFqdn) && !string.IsNullOrWhiteSpace(coolFqdn))
        {
            string host = coolFqdn.Trim().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(host))
            {
                return host.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? host : $"https://{host}";
            }
        }

        // 5. Container Ortam Değişkenlerinden (Environment) otomatik tespit
        if (env != null)
        {
            foreach (var envVar in env)
            {
                var eqIdx = envVar.IndexOf('=');
                if (eqIdx <= 0) continue;
                var key = envVar[..eqIdx].Trim();
                var val = envVar[(eqIdx + 1)..].Trim();

                if (string.IsNullOrWhiteSpace(val)) continue;

                if (key.Equals("VIRTUAL_HOST", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("LETSENCRYPT_HOST", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("NEXT_PUBLIC_SITE_URL", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("SITE_URL", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("APP_URL", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("PUBLIC_URL", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("BASE_URL", StringComparison.OrdinalIgnoreCase) ||
                    key.Equals("CORVUS_URL", StringComparison.OrdinalIgnoreCase))
                {
                    string candidate = val.Split(' ', ',')[0].Trim('"', '\'');
                    if (!string.IsNullOrWhiteSpace(candidate) && (candidate.Contains('.') || candidate.StartsWith("http", StringComparison.OrdinalIgnoreCase)))
                    {
                        return candidate.StartsWith("http", StringComparison.OrdinalIgnoreCase) ? candidate : $"https://{candidate}";
                    }
                }
            }
        }

        return null;
    }

    public Service MapContainerToService(DockerContainerInfo container) => MapContainerToService(container, null);

    public Service MapContainerToService(DockerContainerInfo container, IEnumerable<string>? env)
    {
        // Temiz isim çıkarma: "/web_app" -> "web_app"
        string rawName = container.Names?.FirstOrDefault() ?? container.Id[..12];
        string cleanName = rawName.TrimStart('/');

        // Glance benzeri etiket (label) zenginleştirme
        var labels = container.Labels ?? new Dictionary<string, string>();

        string displayName = labels.TryGetValue("corvus.name", out var lName) && !string.IsNullOrWhiteSpace(lName)
            ? lName
            : cleanName;

        string? description = labels.TryGetValue("corvus.description", out var lDesc)
            ? lDesc
            : null;

        string? icon = labels.TryGetValue("corvus.icon", out var lIcon)
            ? lIcon
            : null;

        string category;
        if (labels.TryGetValue("corvus.category", out var lCat) && !string.IsNullOrWhiteSpace(lCat))
        {
            category = lCat;
        }
        else if (labels.TryGetValue("com.docker.compose.project", out var composeProj) && !string.IsNullOrWhiteSpace(composeProj))
        {
            category = $"{char.ToUpperInvariant(composeProj[0])}{composeProj[1..]}";
        }
        else
        {
            category = DeriveCategoryFromName(cleanName);
        }

        string? url = null;
        if (labels.TryGetValue("corvus.url", out var lUrl) && !string.IsNullOrWhiteSpace(lUrl))
        {
            url = lUrl;
        }
        else
        {
            // Ters Proxy (Traefik, Caddy, VIRTUAL_HOST, Env) etiketlerinden otomatik domain çıkarımı
            url = ExtractDomainFromLabels(labels, env);

            // Port bindings'den varsayılan URL türetme
            if (string.IsNullOrWhiteSpace(url))
            {
                var pubPort = container.Ports?.FirstOrDefault(p => p.PublicPort.HasValue && p.PublicPort > 0);
                if (pubPort?.PublicPort != null)
                {
                    string host = Environment.GetEnvironmentVariable("CORVUS_PUBLIC_HOST") ?? "localhost";
                    url = $"http://{host}:{pubPort.PublicPort}";
                }
            }
        }

        string? healthCheckUrl = labels.TryGetValue("corvus.healthcheck", out var lHealth)
            ? lHealth
            : null;

        // Container state -> Corvus status eşleme
        string status = container.State.ToLowerInvariant() switch
        {
            "running" => "healthy",
            "restarting" => "degraded",
            "paused" => "degraded",
            "exited" => "down",
            "dead" => "down",
            _ => "unknown"
        };

        string checkType;
        if (labels.TryGetValue("corvus.check_type", out var lCheck) && !string.IsNullOrWhiteSpace(lCheck))
        {
            checkType = lCheck.ToLowerInvariant();
        }
        else if (!string.IsNullOrWhiteSpace(url))
        {
            checkType = "http";
        }
        else if (container.Ports?.Any(p => p.PublicPort.HasValue && p.PublicPort > 0) == true)
        {
            checkType = "tcp";
        }
        else
        {
            checkType = "docker";
        }

        int? port = null;
        var firstPubPort = container.Ports?.FirstOrDefault(p => p.PublicPort.HasValue && p.PublicPort > 0);
        if (firstPubPort != null)
        {
            port = firstPubPort.PublicPort;
        }
        else if (container.Ports?.Count > 0)
        {
            port = container.Ports[0].PrivatePort;
        }

        var tags = ExtractTagsFromLabels(labels);

        return new Service
        {
            Id = $"docker_{container.Id[..Math.Min(12, container.Id.Length)]}",
            Source = "docker",
            ContainerId = container.Id,
            Name = displayName,
            Description = description,
            Url = url,
            Icon = icon,
            Category = category,
            HealthCheckUrl = healthCheckUrl,
            Status = status,
            CheckType = checkType,
            Port = port,
            IsUptimeEnabled = false,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o"),
            Tags = tags
        };
    }

    public static string DeriveCategoryFromName(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "General";
        string lower = name.Trim().ToLowerInvariant();

        if (lower.StartsWith("internal-") || lower.StartsWith("internal_"))
            return "Internal";
        if (lower.StartsWith("core-") || lower.StartsWith("core_"))
            return "Core";
        if (lower.EndsWith("_web") || lower.EndsWith("-web") || lower.StartsWith("web-") || lower.StartsWith("web_"))
            return "Web";
        if (lower.Contains("postgres") || lower.Contains("mysql") || lower.Contains("mariadb") || lower.Contains("redis") || lower.Contains("mongo") || lower.Contains("-db") || lower.Contains("_db"))
            return "Database";
        if (lower.Contains("mail") || lower.Contains("stalwart") || lower.Contains("postfix"))
            return "Mail";

        return "General";
    }
}
