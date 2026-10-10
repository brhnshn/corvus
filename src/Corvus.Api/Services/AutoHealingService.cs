using System.Collections.Concurrent;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IAutoHealingService
{
    Task<bool> TryAutoHealAsync(DockerContainerInfo container, int exitCode, CancellationToken cancellationToken = default);
    int GetRecentRestartCount(string containerId);
    void ResetHistory(string containerId);
}

public class AutoHealingService : IAutoHealingService
{
    private readonly IDockerService _dockerService;
    private readonly INotificationService _notificationService;
    private readonly ILogger<AutoHealingService> _logger;

    // Konteyner başına son yeniden başlatma zaman damgaları (Thread-safe)
    private readonly ConcurrentDictionary<string, List<DateTime>> _restarts = new(StringComparer.OrdinalIgnoreCase);

    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    private const int MaxRestartsInWindow = 2;

    public AutoHealingService(
        IDockerService dockerService,
        INotificationService notificationService,
        ILogger<AutoHealingService> logger)
    {
        _dockerService = dockerService;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<bool> TryAutoHealAsync(DockerContainerInfo container, int exitCode, CancellationToken cancellationToken = default)
    {
        // 1. Sıfır çıkış kodu normal durdurmadır; auto-heal yapılmaz
        if (exitCode == 0)
        {
            return false;
        }

        // 2. Etiket kontrolü: Eğer corvus.autoheal=false veya autoheal=false ise atla
        if (container.Labels != null)
        {
            if (container.Labels.TryGetValue("corvus.autoheal", out var ahVal) && 
                string.Equals(ahVal, "false", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
            if (container.Labels.TryGetValue("autoheal", out var shortAh) && 
                string.Equals(shortAh, "false", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        string containerName = container.Names?.FirstOrDefault()?.TrimStart('/') 
            ?? container.Id.Substring(0, Math.Min(12, container.Id.Length));

        var now = DateTime.UtcNow;
        var timestamps = _restarts.GetOrAdd(container.Id, _ => new List<DateTime>());

        lock (timestamps)
        {
            // Pencere dışındaki eski kayıtları temizle
            timestamps.RemoveAll(t => now - t > Window);

            // 3. Crash Loop / Flapping Koruması: 15 dakikada en fazla 2 deneme
            if (timestamps.Count >= MaxRestartsInWindow)
            {
                _logger.LogWarning(
                    "Crash loop tespit edildi! Konteyner {ContainerName} ({ContainerId}) son 15 dakikada {Count} kez yeniden başlatıldı. Sonsuz döngü engellendi.",
                    containerName, container.Id, timestamps.Count);

                _ = _notificationService.DispatchContainerAutoHealedAlertAsync(
                    containerName,
                    container.Id,
                    exitCode,
                    success: false,
                    $"Crash loop koruması devreye girdi. Son 15 dakikada {MaxRestartsInWindow} kez başlatma denendi.",
                    cancellationToken);

                return false;
            }

            timestamps.Add(now);
        }

        _logger.LogInformation(
            "Auto-Healing tetiklendi: {ContainerName} (ID: {ContainerId}, ExitCode: {ExitCode}) otomatik olarak yeniden başlatılıyor...",
            containerName, container.Id, exitCode);

        // 4. Yeniden Başlatma İşlemi
        var startResult = await _dockerService.StartContainerAsync(container.Id, cancellationToken);
        if (!startResult.Success)
        {
            // Eğer Start başarısız olduysa Restart dene
            startResult = await _dockerService.RestartContainerAsync(container.Id, cancellationToken);
        }

        if (startResult.Success)
        {
            _logger.LogInformation("Konteyner başarıyla otomatik kurtarıldı (Auto-Healed): {ContainerName}", containerName);

            _ = _notificationService.DispatchContainerAutoHealedAlertAsync(
                containerName,
                container.Id,
                exitCode,
                success: true,
                "Konteyner sıfır dışı çıkış kodundan sonra başarıyla otomatik olarak yeniden başlatıldı.",
                cancellationToken);

            _dockerService.InvalidateContainersCache();
            return true;
        }

        _logger.LogWarning(
            "Konteyner otomatik başlatılamadı: {ContainerName} (Hata: {Error})",
            containerName, startResult.Message);

        _ = _notificationService.DispatchContainerAutoHealedAlertAsync(
            containerName,
            container.Id,
            exitCode,
            success: false,
            $"Otomatik yeniden başlatma başarısız oldu: {startResult.Message}",
            cancellationToken);

        return false;
    }

    public int GetRecentRestartCount(string containerId)
    {
        if (_restarts.TryGetValue(containerId, out var list))
        {
            var now = DateTime.UtcNow;
            lock (list)
            {
                list.RemoveAll(t => now - t > Window);
                return list.Count;
            }
        }
        return 0;
    }

    public void ResetHistory(string containerId)
    {
        if (_restarts.TryGetValue(containerId, out var list))
        {
            lock (list)
            {
                list.Clear();
            }
        }
    }
}
