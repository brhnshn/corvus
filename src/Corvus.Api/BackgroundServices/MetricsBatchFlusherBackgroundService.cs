using Corvus.Api.Data;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services.Systems;

namespace Corvus.Api.BackgroundServices;

/// <summary>
/// Her 60 saniyede bir TelemetryRingBuffer'daki son 60 saniyelik verileri 1m ortalamasi
/// halinde system_metrics_1m tablosuna tek bir transaction ile toplu yazan arka plan servisi.
/// Saniyelik disk I/O'sunu ve SQLite kilitlenme riskini sifirlar.
/// </summary>
public class MetricsBatchFlusherBackgroundService : Microsoft.Extensions.Hosting.BackgroundService
{
    private readonly ITelemetryRingBuffer _ringBuffer;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MetricsBatchFlusherBackgroundService> _logger;
    private readonly TimeSpan _flushInterval = TimeSpan.FromSeconds(60);

    public MetricsBatchFlusherBackgroundService(
        ITelemetryRingBuffer ringBuffer,
        IServiceProvider serviceProvider,
        ILogger<MetricsBatchFlusherBackgroundService> logger)
    {
        _ringBuffer = ringBuffer;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MetricsBatchFlusherBackgroundService baslatildi. Periyot: {Interval}s", _flushInterval.TotalSeconds);

        using var timer = new PeriodicTimer(_flushInterval);

        while (!stoppingToken.IsCancellationRequested && await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await FlushBatchAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MetricsBatchFlusher batch yazma sirasinda hata olustu.");
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("MetricsBatchFlusherBackgroundService durduruluyor, kapanis oncesi telemetri arabellegi diske bosaltiliyor...");
        try
        {
            await FlushBatchAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Uygulama kapanirken telemetri arabellegi diske bosaltilamadi.");
        }

        await base.StopAsync(cancellationToken);
    }

    public async Task FlushBatchAsync(CancellationToken stoppingToken = default)
    {
        var snapshot = _ringBuffer.DrainForBatchFlush();
        if (snapshot.Count == 0) return;

        var batch = new List<SystemMetric1mEntity>(snapshot.Count);
        string recordedAtUtc = DateTime.UtcNow.ToString("o");

        foreach (var (systemId, points) in snapshot)
        {
            if (points.Length == 0) continue;

            // 1 dakikalik penceredeki telemetri noktalarinin ortalamalarini hesapla
            double avgCpu = 0;
            long avgRamUsed = 0;
            long avgRamTotal = 0;
            long avgDiskUsed = 0;
            long avgDiskTotal = 0;
            long avgNetRx = 0;
            long avgNetTx = 0;
            double avgLoad1m = 0;
            double avgLoad5m = 0;
            double avgLoad15m = 0;
            ushort cores = points[^1].CpuCores;

            for (int i = 0; i < points.Length; i++)
            {
                var pt = points[i];
                avgCpu += pt.CpuPercent;
                avgRamUsed += pt.RamUsedBytes;
                avgRamTotal += pt.RamTotalBytes;
                avgDiskUsed += pt.DiskUsedBytes;
                avgDiskTotal += pt.DiskTotalBytes;
                avgNetRx += pt.NetRxBytesSec;
                avgNetTx += pt.NetTxBytesSec;
                avgLoad1m += pt.LoadAvg1m;
                avgLoad5m += pt.LoadAvg5m;
                avgLoad15m += pt.LoadAvg15m;
            }

            int n = points.Length;
            avgCpu /= n;
            avgRamUsed /= n;
            avgRamTotal /= n;
            avgDiskUsed /= n;
            avgDiskTotal /= n;
            avgNetRx /= n;
            avgNetTx /= n;
            avgLoad1m /= n;
            avgLoad5m /= n;
            avgLoad15m /= n;

            batch.Add(new SystemMetric1mEntity
            {
                SystemId = systemId,
                RecordedAt = recordedAtUtc,
                CpuPercent = Math.Round(avgCpu, 2),
                CpuCores = cores > 0 ? cores : 1,
                RamUsedBytes = avgRamUsed,
                RamTotalBytes = avgRamTotal,
                DiskUsedBytes = avgDiskUsed,
                DiskTotalBytes = avgDiskTotal,
                NetworkRxBytesSec = avgNetRx,
                NetworkTxBytesSec = avgNetTx,
                LoadAvg1m = Math.Round(avgLoad1m, 2),
                LoadAvg5m = Math.Round(avgLoad5m, 2),
                LoadAvg15m = Math.Round(avgLoad15m, 2)
            });
        }

        if (batch.Count > 0)
        {
            using var scope = _serviceProvider.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<ISystemMetricRepository>();
            int inserted = await repo.Insert1mBatchAsync(batch);
            _logger.LogDebug("MetricsBatchFlusher: {Count} sistem icin 1m metrikleri kaydedildi.", inserted);
        }
    }
}
