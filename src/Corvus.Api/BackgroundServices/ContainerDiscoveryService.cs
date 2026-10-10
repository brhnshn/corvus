using System.Collections.Concurrent;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.BackgroundServices;

public class ContainerDiscoveryService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ContainerDiscoveryService> _logger;
    private readonly IDockerService _docker;
    private readonly IDockerHttpClient? _dockerClient;
    private readonly ConcurrentDictionary<string, (string ImageId, List<string>? Env)> _inspectCache = new();
    private readonly ConcurrentDictionary<string, string> _previousStates = new();
    private string _lastFingerprint = string.Empty;

    public ContainerDiscoveryService(
        IServiceProvider services, 
        ILogger<ContainerDiscoveryService> logger,
        IDockerService docker,
        IDockerHttpClient? dockerClient = null)
    {
        _services = services;
        _logger = logger;
        _docker = docker;
        _dockerClient = dockerClient;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ContainerDiscoveryService başlatıldı (Periyot: 10sn).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                bool isDockerUp = await _docker.IsAvailableAsync(stoppingToken);
                if (isDockerUp)
                {
                    var containers = await _docker.GetContainersAsync(stoppingToken);
                    var activeIds = new List<string>(containers.Count);
                    var batchServices = new List<Service>(containers.Count);

                    foreach (var c in containers)
                    {
                        if (_docker.ShouldIgnoreContainer(c))
                        {
                            continue;
                        }

                        activeIds.Add(c.Id);

                        // Konteyner durum geçişini kontrol et (Crash / Exit Code tespiti)
                        string currentState = c.State?.ToLowerInvariant() ?? "unknown";
                        if (_previousStates.TryGetValue(c.Id, out var prevState))
                        {
                            if (prevState == "running" && (currentState == "exited" || currentState == "dead"))
                            {
                                // Konteyner çalışırken aniden kapandı; Inspect ile çıkış kodunu doğrula
                                _ = CheckAndAlertCrashAsync(c, stoppingToken);
                            }
                        }
                        _previousStates[c.Id] = currentState;

                        List<string>? env = null;
                        if (_dockerClient != null && DockerService.ExtractDomainFromLabels(c.Labels ?? new Dictionary<string, string>()) == null)
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
                                    var inspect = await _dockerClient.InspectContainerAsync(c.Id, stoppingToken);
                                    env = inspect?.Config?.Env;
                                    _inspectCache[c.Id] = (currentImage, env);
                                }
                                catch { }
                            }
                        }

                        batchServices.Add(_docker.MapContainerToService(c, env));
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

                    // Parmak izi kontrolü ile gereksiz DB write transaction'larını ve DI Scope tahsislerini atla
                    string currentFingerprint = ComputeFingerprint(batchServices, activeIds);
                    if (currentFingerprint != _lastFingerprint)
                    {
                        using var scope = _services.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<IServicesRepository>();
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

    private async Task CheckAndAlertCrashAsync(DockerContainerInfo container, CancellationToken ct)
    {
        try
        {
            if (_dockerClient == null) return;

            var inspect = await _dockerClient.InspectContainerAsync(container.Id, ct);
            if (inspect?.State == null) return;

            int exitCode = inspect.State.ExitCode;
            // Sıfır olmayan çıkış kodu (Crash / OOM / Hata) durumunda alarm gönder
            if (exitCode != 0)
            {
                string containerName = container.Names?.FirstOrDefault()?.TrimStart('/') ?? container.Id.Substring(0, Math.Min(12, container.Id.Length));
                string? error = !string.IsNullOrWhiteSpace(inspect.State.Error) ? inspect.State.Error : null;

                _logger.LogWarning("Konteyner beklenmedik şekilde durdu: {ContainerName} (ID: {ContainerId}, ExitCode: {ExitCode})", containerName, container.Id, exitCode);

                using var scope = _services.CreateScope();
                var notif = scope.ServiceProvider.GetRequiredService<INotificationService>();
                await notif.DispatchContainerCrashAlertAsync(containerName, container.Id, exitCode, error, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Konteyner çıkış kodu incelenirken hata: {ContainerId}", container.Id);
        }
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
