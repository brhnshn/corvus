using System.Collections.Concurrent;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.BackgroundServices;

public class ContainerDiscoveryService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ContainerDiscoveryService> _logger;
    private readonly ConcurrentDictionary<string, (string ImageId, List<string>? Env)> _inspectCache = new();
    private string _lastFingerprint = string.Empty;

    public ContainerDiscoveryService(IServiceProvider services, ILogger<ContainerDiscoveryService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ContainerDiscoveryService başlatıldı (Periyot: 10sn).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var docker = scope.ServiceProvider.GetRequiredService<IDockerService>();
                var dockerClient = scope.ServiceProvider.GetService<IDockerHttpClient>();
                var repo = scope.ServiceProvider.GetRequiredService<IServicesRepository>();

                bool isDockerUp = await docker.IsAvailableAsync(stoppingToken);
                if (isDockerUp)
                {
                    var containers = await docker.GetContainersAsync(stoppingToken);
                    var activeIds = new List<string>(containers.Count);
                    var batchServices = new List<Service>(containers.Count);

                    foreach (var c in containers)
                    {
                        if (docker.ShouldIgnoreContainer(c))
                        {
                            continue;
                        }

                        activeIds.Add(c.Id);

                        List<string>? env = null;
                        if (dockerClient != null && DockerService.ExtractDomainFromLabels(c.Labels ?? new Dictionary<string, string>()) == null)
                        {
                            string currentImage = c.Image ?? string.Empty;
                            if (_inspectCache.TryGetValue(c.Id, out var cached) && cached.ImageId == currentImage)
                            {
                                env = cached.Env;
                            }
                            else
                            {
                                try
                                {
                                    var inspect = await dockerClient.InspectContainerAsync(c.Id, stoppingToken);
                                    env = inspect?.Config?.Env;
                                    _inspectCache[c.Id] = (currentImage, env);
                                }
                                catch { }
                            }
                        }

                        batchServices.Add(docker.MapContainerToService(c, env));
                    }

                    // Artık mevcut olmayan container'ları önbellekten temizle
                    if (_inspectCache.Count > 0)
                    {
                        var activeSet = new HashSet<string>(activeIds);
                        foreach (var key in _inspectCache.Keys)
                        {
                            if (!activeSet.Contains(key))
                            {
                                _inspectCache.TryRemove(key, out _);
                            }
                        }
                    }

                    // Parmak izi kontrolü ile gereksiz DB write transaction'larını atla
                    string currentFingerprint = ComputeFingerprint(batchServices, activeIds);
                    if (currentFingerprint != _lastFingerprint)
                    {
                        await repo.SyncDockerBatchAsync(batchServices, activeIds);
                        _lastFingerprint = currentFingerprint;
                    }
                }
                else
                {
                    _lastFingerprint = string.Empty;
                    _logger.LogDebug("Docker daemon yanıt vermiyor, container keşfi atlandı.");
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Container keşfi döngüsünde hata oluştu.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("ContainerDiscoveryService durduruldu.");
    }

    private static string ComputeFingerprint(List<Service> services, List<string> activeIds)
    {
        var sb = new System.Text.StringBuilder(services.Count * 64 + activeIds.Count * 16);
        sb.Append("A:").Append(activeIds.Count).Append(':');
        for (int i = 0; i < activeIds.Count; i++)
        {
            sb.Append(activeIds[i]).Append(',');
        }
        sb.Append("|S:").Append(services.Count).Append(':');
        for (int i = 0; i < services.Count; i++)
        {
            var s = services[i];
            sb.Append(s.Id).Append('=').Append(s.Status).Append('=').Append(s.Url).Append(';');
        }
        return sb.ToString();
    }
}
