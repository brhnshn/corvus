using Corvus.Api.Data;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.BackgroundServices;

/// <summary>
/// 5 saniyede bir çalışan, bağlı sistemlerin son görülme zamanlarını (last_seen_at)
/// denetleyen ve durumlarını güncelleyen Watchdog servisi:
/// - <= 10s: 'online'
/// - > 15s: 'degraded'
/// - > 30s: 'offline'
/// </summary>
public class SystemWatchdogService : Microsoft.Extensions.Hosting.BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SystemWatchdogService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(5);

    public SystemWatchdogService(
        IServiceProvider serviceProvider,
        ILogger<SystemWatchdogService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SystemWatchdogService baslatildi. Periyot: {Interval}s", _checkInterval.TotalSeconds);

        using var timer = new PeriodicTimer(_checkInterval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await EvaluateSystemsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SystemWatchdogService degerlendirmesi sirasinda hata olustu.");
            }
        }
    }

    private async Task EvaluateSystemsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<ISystemRepository>();
        var tunnelManager = scope.ServiceProvider.GetRequiredService<ISystemTunnelManager>();

        var systems = await repo.GetAllAsync();
        var now = DateTime.UtcNow;

        foreach (var system in systems)
        {
            if (stoppingToken.IsCancellationRequested) break;

            string expectedStatus = "offline";

            if (!string.IsNullOrWhiteSpace(system.LastSeenAt) && DateTime.TryParse(system.LastSeenAt, out var lastSeenUtc))
            {
                var diff = now - lastSeenUtc;
                if (diff.TotalSeconds <= 10)
                {
                    expectedStatus = "online";
                }
                else if (diff.TotalSeconds <= 30)
                {
                    expectedStatus = "degraded";
                }
                else
                {
                    expectedStatus = "offline";
                }
            }

            // Eger tunnel aktif bagli degilse degraded veya offline kabul edilir
            if (!tunnelManager.IsConnected(system.Id) && expectedStatus == "online")
            {
                expectedStatus = "degraded";
            }

            if (system.Status != expectedStatus)
            {
                _logger.LogInformation("Sistem durum degisimi: {SystemName} ({SystemId}) {OldStatus} -> {NewStatus}",
                    system.Name, system.Id, system.Status, expectedStatus);
                await repo.UpdateStatusAsync(system.Id, expectedStatus, system.LastSeenAt ?? now.ToString("o"));
            }
        }
    }
}
