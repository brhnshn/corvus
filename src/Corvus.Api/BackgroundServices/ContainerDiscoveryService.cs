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
                        if (currentState == "running")
                        {
                            _docker.ClearContainerManualStop(c.Id);
                        }
                        else if (_previousStates.TryGetValue(c.Id, out var prevState))
                        {
                            if (prevState == "running" && (currentState == "exited" || currentState == "dead"))
                            {
                                // Konteyner çalışırken kapandı; manuel durdurma değilse Inspect ile çıkış kodunu doğrula
                                await CheckAndAlertCrashAsync(c, stoppingToken);
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

                    // Artık mevcut olmayan container'ları önbellekten ve durum geçmişinden temizle
                    if (_inspectCache.Count > 0 || _previousStates.Count > 0)
                    {
                        var activeSet = new HashSet<string>(activeIds);
                        foreach (var key in _inspectCache.Keys)
                        {
                            if (!activeSet.Contains(key))
                            {
                                _inspectCache.TryRemove(key, out _);
                            }
                        }
                        foreach (var key in _previousStates.Keys)
                        {
                            if (!activeSet.Contains(key))
                            {
                                _previousStates.TryRemove(key, out _);
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

                    // Yerel sunucu (local-host) konteyner önbelleğini Systems Cockpit için ringBuffer'a aktar
                    try
                    {
                        var ringBuffer = _services.GetService<Corvus.Api.Services.Systems.ITelemetryRingBuffer>();
                        if (ringBuffer != null)
                        {
                            var cacheList = new List<Corvus.Api.Models.Systems.SystemContainerCacheEntity>(containers.Count);
                            string nowIso = DateTime.UtcNow.ToString("o");
                            foreach (var c in containers)
                            {
                                cacheList.Add(new Corvus.Api.Models.Systems.SystemContainerCacheEntity
                                {
                                    SystemId = "local-host",
                                    ContainerId = c.Id,
                                    Name = c.Names?.FirstOrDefault()?.TrimStart('/') ?? c.Id[..Math.Min(12, c.Id.Length)],
                                    Image = c.Image,
                                    State = c.State?.ToLowerInvariant() ?? "unknown",
                                    Status = c.Status,
                                    CpuPercent = 0,
                                    MemoryBytes = 0,
                                    PortsJson = "[]",
                                    UpdatedAt = nowIso
                                });
                            }
                            if (ringBuffer.TryGetLatest("local-host", out var latestPt))
                            {
                                ringBuffer.Push("local-host", in latestPt, cacheList);
                            }
                        }
                    }
                    catch { }
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
            if (_docker.IsContainerManuallyStopped(container.Id))
            {
                _logger.LogInformation("Konteyner kullanıcı tarafından manuel durdurulduğu için çökme alarmı ve auto-heal atlandı: {ContainerId}", container.Id);
                return;
            }

            if (_dockerClient == null) return;

            var inspect = await _dockerClient.InspectContainerAsync(container.Id, ct);
            if (inspect?.State == null) return;

            int exitCode = inspect.State.ExitCode;
            // 0 = Normal çıkış, 143 = SIGTERM (standart zarif docker stop)
            if (exitCode == 0 || exitCode == 143)
            {
                return;
            }

            // 137 = SIGKILL; eğer OOMKilled değilse ve hata mesajı yoksa standart docker stop grace-period sonlandırmasıdır
            if (exitCode == 137 && !inspect.State.OOMKilled && string.IsNullOrWhiteSpace(inspect.State.Error))
            {
                return;
            }

            string containerName = container.Names?.FirstOrDefault()?.TrimStart('/') ?? container.Id.Substring(0, Math.Min(12, container.Id.Length));
            string? error = !string.IsNullOrWhiteSpace(inspect.State.Error) ? inspect.State.Error : null;

            _logger.LogWarning("Konteyner beklenmedik şekilde durdu: {ContainerName} (ID: {ContainerId}, ExitCode: {ExitCode})", containerName, container.Id, exitCode);

            using var scope = _services.CreateScope();
            var notif = scope.ServiceProvider.GetRequiredService<INotificationService>();
            await notif.DispatchContainerCrashAlertAsync(containerName, container.Id, exitCode, error, ct);

            var autoHeal = scope.ServiceProvider.GetService<IAutoHealingService>();
            if (autoHeal != null)
            {
                await autoHeal.TryAutoHealAsync(container, exitCode, ct);
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
