using Corvus.Api.Utils;
using Microsoft.Data.Sqlite;

namespace Corvus.Api.BackgroundServices;

public class MemoryTrimmerBackgroundService : BackgroundService
{
    private readonly ILogger<MemoryTrimmerBackgroundService> _logger;

    public MemoryTrimmerBackgroundService(ILogger<MemoryTrimmerBackgroundService> logger)
    {
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MemoryTrimmerBackgroundService başlatıldı (Periyot: 3dk).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                SqliteConnection.ClearAllPools();
                GC.Collect(1, GCCollectionMode.Optimized, blocking: false);
                NativeMemoryTrimmer.Trim();
                _logger.LogDebug("Periyodik bellek kırpma tamamlandı (Sqlite pool temizlendi, Gen1 GC ve malloc_trim tetiklendi).");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bellek kırpma işlemi sırasında hata oluştu.");
            }
        }

        _logger.LogInformation("MemoryTrimmerBackgroundService durduruldu.");
    }
}
