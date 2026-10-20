using System.Collections.Concurrent;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public partial class DockerService : IDockerService
{
    private readonly IDockerHttpClient _client;
    private readonly IOciRegistryClient? _ociRegistryClient;
    private readonly ILogger<DockerService> _logger;
    private readonly IServiceScopeFactory? _scopeFactory;
    private readonly ConcurrentDictionary<string, (DateTime Expiry, ContainerStatsDto Stats)> _statsCache = new();
    private readonly ConcurrentDictionary<string, DateTime> _manuallyStoppedContainers = new(StringComparer.OrdinalIgnoreCase);
    private (DateTime Expiry, List<DockerContainerInfo> Items) _cachedContainers;
    private readonly object _containersLock = new();

    public DockerService(
        IDockerHttpClient client, 
        ILogger<DockerService> logger, 
        IServiceScopeFactory? scopeFactory = null)
        : this(client, logger, null, scopeFactory)
    {
    }

    public DockerService(
        IDockerHttpClient client, 
        ILogger<DockerService> logger, 
        IOciRegistryClient? ociRegistryClient,
        IServiceScopeFactory? scopeFactory = null)
    {
        _client = client;
        _logger = logger;
        _ociRegistryClient = ociRegistryClient;
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

    public void MarkContainerManuallyStopped(string containerId)
    {
        if (string.IsNullOrWhiteSpace(containerId)) return;
        string clean = containerId.Trim();
        var now = DateTime.UtcNow;
        _manuallyStoppedContainers[clean] = now;
        if (clean.Length >= 12)
        {
            _manuallyStoppedContainers[clean[..12]] = now;
        }
    }

    public void ClearContainerManualStop(string containerId)
    {
        if (string.IsNullOrWhiteSpace(containerId)) return;
        string clean = containerId.Trim();
        _manuallyStoppedContainers.TryRemove(clean, out _);
        if (clean.Length >= 12)
        {
            string prefix = clean[..12];
            _manuallyStoppedContainers.TryRemove(prefix, out _);
            foreach (var key in _manuallyStoppedContainers.Keys)
            {
                if (key.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    _manuallyStoppedContainers.TryRemove(key, out _);
                }
            }
        }
        else
        {
            foreach (var key in _manuallyStoppedContainers.Keys)
            {
                if (key.StartsWith(clean, StringComparison.OrdinalIgnoreCase))
                {
                    _manuallyStoppedContainers.TryRemove(key, out _);
                }
            }
        }
    }

    public bool IsContainerManuallyStopped(string containerId)
    {
        if (string.IsNullOrWhiteSpace(containerId)) return false;
        string clean = containerId.Trim();
        if (_manuallyStoppedContainers.ContainsKey(clean))
        {
            return true;
        }
        if (clean.Length >= 12 && _manuallyStoppedContainers.ContainsKey(clean[..12]))
        {
            return true;
        }
        foreach (var key in _manuallyStoppedContainers.Keys)
        {
            if (clean.StartsWith(key, StringComparison.OrdinalIgnoreCase) || key.StartsWith(clean, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    public async Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        ClearContainerManualStop(containerId);
        var res = await _client.RestartContainerAsync(containerId, cancellationToken);
        if (res.Success)
        {
            ClearContainerManualStop(containerId);
            InvalidateContainersCache();
        }
        return res;
    }

    public async Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        ClearContainerManualStop(containerId);
        var res = await _client.StartContainerAsync(containerId, cancellationToken);
        if (res.Success)
        {
            ClearContainerManualStop(containerId);
            InvalidateContainersCache();
        }
        return res;
    }

    public async Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        MarkContainerManuallyStopped(containerId);
        var res = await _client.StopContainerAsync(containerId, cancellationToken);
        if (res.Success)
        {
            MarkContainerManuallyStopped(containerId);
            InvalidateContainersCache();
        }
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

    public async Task<DockerActionResult> DeleteContainerAsync(string containerId, bool force = false, bool removeVolumes = false, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(containerId))
        {
            return new DockerActionResult(false, "Container ID boş olamaz.", 400);
        }

        MarkContainerManuallyStopped(containerId);
        var res = await _client.DeleteContainerAsync(containerId, force, removeVolumes, cancellationToken);
        if (res.Success)
        {
            ClearContainerManualStop(containerId);
            _statsCache.TryRemove(containerId, out _);
            InvalidateContainersCache();
        }
        return res;
    }
}
