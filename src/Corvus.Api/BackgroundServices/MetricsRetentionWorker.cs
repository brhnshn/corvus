using Corvus.Api.Data;

namespace Corvus.Api.BackgroundServices;

/// <summary>
/// Her gece 03:00 UTC (veya her 6 saatte bir) calisarak:
/// - 7 gunden eski 1m metriklerini saatlik ozetlere (system_metrics_1h) sikistirip siler,
/// - 30 gunden eski saatlik metrikleri budar.
/// Boylece 1 sistemin 1 aylik disk ayak izi yalnizca ~2.5 MB (20 sistem = ~50 MB) seviyesinde kalir.
/// </summary>
public class MetricsRetentionWorker : Microsoft.Extensions.Hosting.BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MetricsRetentionWorker> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(6);

    public MetricsRetentionWorker(
        IServiceProvider serviceProvider,
        ILogger<MetricsRetentionWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MetricsRetentionWorker baslatildi. Kontrol periyodu: {Interval} saat", _checkInterval.TotalHours);

        // Ilk baslangicta 1 dakika sonra ilk temizligi yap, ardindan 6 saatte bir tekrarla
        await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<ISystemMetricRepository>();
                int pruned = await repo.AggregateAndPruneRollingMetricsAsync(retention1mDays: 7, retention1hDays: 30);
                if (pruned > 0)
                {
                    _logger.LogInformation("MetricsRetentionWorker: {Pruned} eski metrik kaydi saatlik ozetlendi ve budandi.", pruned);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MetricsRetentionWorker budama sirasinda hata olustu.");
            }

            try
            {
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
