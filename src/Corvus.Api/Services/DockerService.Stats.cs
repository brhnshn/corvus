using System.Collections.Concurrent;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public partial class DockerService
{
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
}
