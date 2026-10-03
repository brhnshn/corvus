using System.Collections.Concurrent;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IDockerService
{
    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
    Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default);
    Task<List<DockerContainerInfo>> GetContainersAsync(CancellationToken cancellationToken = default);
    Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default);
    Task<Dictionary<string, ContainerStatsDto>> GetActiveContainersStatsSummaryAsync(CancellationToken cancellationToken = default);
    Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default);
    Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default);
    Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default);
    Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default);
    Task<DockerPruneResult> ExecuteSystemPruneAsync(DockerPruneRequest request, CancellationToken cancellationToken = default);
    Task<DockerSystemDfResponse?> GetSystemDiskUsageAsync(CancellationToken cancellationToken = default);
    Task<DockerSelectivePruneResult> ExecuteSelectivePruneAsync(DockerSelectivePruneRequest request, CancellationToken cancellationToken = default);
    Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UpdateContainerAsync(string containerId, DockerContainerUpdateRequest request, CancellationToken cancellationToken = default);
    bool ShouldIgnoreContainer(DockerContainerInfo container);
    Service MapContainerToService(DockerContainerInfo container, IEnumerable<string>? env = null);
    void InvalidateContainersCache();
}

public class DockerService : IDockerService
{
    private readonly IDockerHttpClient _client;
    private readonly ILogger<DockerService> _logger;
    private readonly IServiceScopeFactory? _scopeFactory;
    private readonly ConcurrentDictionary<string, (DateTime Expiry, ContainerStatsDto Stats)> _statsCache = new();
    private (DateTime Expiry, List<DockerContainerInfo> Items) _cachedContainers;
    private readonly object _containersLock = new();

    public DockerService(
        IDockerHttpClient client, 
        ILogger<DockerService> logger, 
        IServiceScopeFactory? scopeFactory = null)
    {
        _client = client;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default) =>
        _client.PingAsync(cancellationToken);

    public Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default) =>
        _client.GetVersionAsync(cancellationToken);

    public async Task<List<DockerContainerInfo>> GetContainersAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        lock (_containersLock)
        {
            if (_cachedContainers.Items != null && now < _cachedContainers.Expiry)
            {
                return _cachedContainers.Items;
            }
        }

        var list = await _client.ListContainersAsync(all: true, cancellationToken);

        // service_overrides tablosundaki kayıtlı etiketleri yükle
        Dictionary<string, List<string>>? overrideTags = null;
        if (_scopeFactory != null)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<Corvus.Api.Data.IServicesRepository>();
                overrideTags = await repo.GetAllContainerTagsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Container override etiketleri veritabanından yüklenemedi.");
            }
        }

        foreach (var c in list)
        {
            var labelTags = ExtractTagsFromLabels(c.Labels);
            List<string>? savedTags = null;
            if (overrideTags != null)
            {
                if (overrideTags.TryGetValue(c.Id, out var directMatch))
                {
                    savedTags = directMatch;
                }
                else if (c.Id.Length >= 12 && overrideTags.TryGetValue(c.Id[..12], out var shortMatch))
                {
                    savedTags = shortMatch;
                }
            }

            var merged = new List<string>(labelTags);
            if (savedTags != null)
            {
                merged.AddRange(savedTags);
            }

            c.Tags = merged.Where(t => !string.IsNullOrWhiteSpace(t))
                           .Distinct(StringComparer.OrdinalIgnoreCase)
                           .ToList();
        }

        lock (_containersLock)
        {
            _cachedContainers = (now.AddSeconds(10), list);
        }
        return list;
    }

    public void InvalidateContainersCache()
    {
        lock (_containersLock)
        {
            _cachedContainers = default;
        }
    }

    public async Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        var res = await _client.RestartContainerAsync(containerId, cancellationToken);
        if (res.Success) InvalidateContainersCache();
        return res;
    }

    public async Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        var res = await _client.StartContainerAsync(containerId, cancellationToken);
        if (res.Success) InvalidateContainersCache();
        return res;
    }

    public async Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        var res = await _client.StopContainerAsync(containerId, cancellationToken);
        if (res.Success) InvalidateContainersCache();
        return res;
    }

    public async Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        var res = await _client.PauseContainerAsync(containerId, cancellationToken);
        if (res.Success) InvalidateContainersCache();
        return res;
    }

    public async Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        var res = await _client.UnpauseContainerAsync(containerId, cancellationToken);
        if (res.Success) InvalidateContainersCache();
        return res;
    }

    public async Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default)
    {
        if (_statsCache.TryGetValue(containerId, out var cached) && DateTime.UtcNow < cached.Expiry)
        {
            return cached.Stats;
        }

        var stats = await _client.GetContainerStatsAsync(containerId, cancellationToken);
        if (stats != null)
        {
            var now = DateTime.UtcNow;
            _statsCache[containerId] = (now.AddSeconds(8), stats);

            if (_statsCache.Count > 30)
            {
                foreach (var kvp in _statsCache)
                {
                    if (now > kvp.Value.Expiry)
                    {
                        _statsCache.TryRemove(kvp.Key, out _);
                    }
                }
            }
        }

        return stats;
    }

    public async Task<Dictionary<string, ContainerStatsDto>> GetActiveContainersStatsSummaryAsync(CancellationToken cancellationToken = default)
    {
        var containers = await GetContainersAsync(cancellationToken);
        var running = containers.Where(c => string.Equals(c.State, "running", StringComparison.OrdinalIgnoreCase)).ToList();

        var result = new Dictionary<string, ContainerStatsDto>(StringComparer.OrdinalIgnoreCase);
        if (running.Count == 0) return result;

        var parallelOptions = new ParallelOptions
        {
            MaxDegreeOfParallelism = Math.Clamp(Environment.ProcessorCount * 4, 8, 32),
            CancellationToken = cancellationToken
        };

        var concurrentDict = new ConcurrentDictionary<string, ContainerStatsDto>(StringComparer.OrdinalIgnoreCase);

        await Parallel.ForEachAsync(running, parallelOptions, async (container, ct) =>
        {
            try
            {
                var stats = await GetContainerStatsAsync(container.Id, ct);
                if (stats != null)
                {
                    concurrentDict[container.Id] = stats;
                }
            }
            catch
            {
                // Tekil stats hatası tüm toplu yanıtı engellemesin
            }
        });

        foreach (var kvp in concurrentDict)
        {
            result[kvp.Key] = kvp.Value;
        }

        return result;
    }

    public Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default) =>
        _client.GetContainerLogsAsync(containerId, tail, cancellationToken);

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

    public Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default) =>
        _client.CreateExecInstanceAsync(containerId, shell, cancellationToken);

    public Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default) =>
        _client.StartExecStreamAsync(execId, cancellationToken);

    public Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default) =>
        _client.ResizeExecAsync(execId, width, height, cancellationToken);

    public async Task<DockerPruneResult> ExecuteSystemPruneAsync(DockerPruneRequest request, CancellationToken cancellationToken = default)
    {
        var result = new DockerPruneResult { Success = true };

        try
        {
            // 1. Containers prune
            if (request.PruneContainers)
            {
                var cRes = await _client.PruneContainersAsync(cancellationToken);
                if (cRes != null)
                {
                    result.ContainersDeletedCount = cRes.ContainersDeleted?.Count ?? 0;
                    result.ContainersSpaceReclaimed = cRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += cRes.SpaceReclaimed;
                }
            }

            // 2. Images prune
            if (request.PruneImages)
            {
                var iRes = await _client.PruneImagesAsync(request.PruneAllImages, cancellationToken);
                if (iRes != null)
                {
                    result.ImagesDeletedCount = iRes.ImagesDeleted?.Count ?? 0;
                    result.ImagesSpaceReclaimed = iRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += iRes.SpaceReclaimed;
                }
            }

            // 3. Volumes prune
            if (request.PruneVolumes)
            {
                var vRes = await _client.PruneVolumesAsync(cancellationToken);
                if (vRes != null)
                {
                    result.VolumesDeletedCount = vRes.VolumesDeleted?.Count ?? 0;
                    result.VolumesSpaceReclaimed = vRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += vRes.SpaceReclaimed;
                }
            }

            // 4. Networks prune
            if (request.PruneNetworks)
            {
                var nRes = await _client.PruneNetworksAsync(cancellationToken);
                if (nRes != null)
                {
                    result.NetworksDeletedCount = nRes.NetworksDeleted?.Count ?? 0;
                }
            }

            // 5. Build cache prune
            if (request.PruneBuildCache)
            {
                var bRes = await _client.PruneBuildCacheAsync(cancellationToken);
                if (bRes != null)
                {
                    result.BuildCacheSpaceReclaimed = bRes.SpaceReclaimed;
                    result.TotalSpaceReclaimed += bRes.SpaceReclaimed;
                }
            }

            // Prune sonrası yerel container önbelleğini temizle
            lock (_containersLock)
            {
                _cachedContainers = (DateTime.MinValue, new List<DockerContainerInfo>());
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "System prune sırasında beklenmeyen hata");
            result.Success = false;
            result.ErrorMessage = ex.Message;
        }

        return result;
    }

    public Task<DockerSystemDfResponse?> GetSystemDiskUsageAsync(CancellationToken cancellationToken = default) =>
        _client.GetSystemDiskUsageAsync(cancellationToken);

    public async Task<DockerSelectivePruneResult> ExecuteSelectivePruneAsync(DockerSelectivePruneRequest request, CancellationToken cancellationToken = default)
    {
        var result = new DockerSelectivePruneResult { Success = true };

        try
        {
            // 1. Silinecek konteynerler
            if (request.ContainerIds != null && request.ContainerIds.Count > 0)
            {
                foreach (var cId in request.ContainerIds)
                {
                    var delRes = await _client.DeleteContainerAsync(cId, force: true, removeVolumes: false, cancellationToken);
                    if (delRes.Success)
                    {
                        result.DeletedContainers.Add(cId);
                    }
                    else if (!string.IsNullOrWhiteSpace(delRes.Message))
                    {
                        result.Errors.Add($"Container {cId[..Math.Min(12, cId.Length)]}: {delRes.Message}");
                    }
                }
            }

            // 2. Silinecek imajlar
            if (request.ImageIds != null && request.ImageIds.Count > 0)
            {
                foreach (var imgId in request.ImageIds)
                {
                    var delRes = await _client.DeleteImageAsync(imgId, force: false, cancellationToken);
                    if (delRes.Success)
                    {
                        result.DeletedImages.Add(imgId);
                    }
                    else if (!string.IsNullOrWhiteSpace(delRes.Message))
                    {
                        result.Errors.Add($"Image {imgId[..Math.Min(12, imgId.Length)]}: {delRes.Message}");
                    }
                }
            }

            // 3. Silinecek hacimler
            if (request.VolumeNames != null && request.VolumeNames.Count > 0)
            {
                foreach (var vName in request.VolumeNames)
                {
                    var delRes = await _client.DeleteVolumeAsync(vName, force: false, cancellationToken);
                    if (delRes.Success)
                    {
                        result.DeletedVolumes.Add(vName);
                    }
                    else if (!string.IsNullOrWhiteSpace(delRes.Message))
                    {
                        result.Errors.Add($"Volume {vName}: {delRes.Message}");
                    }
                }
            }

            // 4. Build cache
            if (request.PruneBuildCache)
            {
                var bRes = await _client.PruneBuildCacheAsync(cancellationToken);
                if (bRes != null)
                {
                    result.BuildCachePruned = true;
                    result.TotalSpaceReclaimed += bRes.SpaceReclaimed;
                }
            }

            // Konteyner önbelleğini temizle
            InvalidateContainersCache();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Seçici prune sırasında hata");
            result.Success = false;
            result.Errors.Add(ex.Message);
        }

        return result;
    }

    public Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default) =>
        _client.InspectContainerAsync(containerId, cancellationToken);

    public async Task<DockerActionResult> UpdateContainerAsync(string containerId, DockerContainerUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var result = await _client.UpdateContainerAsync(containerId, request, cancellationToken);
        if (result.Success)
        {
            InvalidateContainersCache();
        }
        return result;
    }

    public static List<string> ExtractTagsFromLabels(Dictionary<string, string>? labels)
    {
        var tags = new List<string>();
        if (labels == null) return tags;

        if (labels.TryGetValue("corvus.tags", out var lTags) && !string.IsNullOrWhiteSpace(lTags))
        {
            tags.AddRange(lTags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }
        if (labels.TryGetValue("environment", out var envTag) && !string.IsNullOrWhiteSpace(envTag))
        {
            tags.Add(envTag.Trim());
        }
        else if (labels.TryGetValue("env", out var shortEnvTag) && !string.IsNullOrWhiteSpace(shortEnvTag))
        {
            tags.Add(shortEnvTag.Trim());
        }
        if (labels.TryGetValue("com.docker.compose.project", out var cProj) && !string.IsNullOrWhiteSpace(cProj))
        {
            tags.Add(cProj.Trim());
        }
        return tags.Where(t => !string.IsNullOrWhiteSpace(t))
                   .Distinct(StringComparer.OrdinalIgnoreCase)
                   .ToList();
    }
}
