using Corvus.Api.Data;
using Corvus.Api.Utils;
using Microsoft.Data.Sqlite;

namespace Corvus.Api.BackgroundServices;

public class MemoryTrimmerBackgroundService : BackgroundService
{
    private readonly IDbConnectionFactory? _dbConnectionFactory;
    private readonly ILogger<MemoryTrimmerBackgroundService> _logger;

    public MemoryTrimmerBackgroundService(
        ILogger<MemoryTrimmerBackgroundService> logger,
        IDbConnectionFactory? dbConnectionFactory = null)
    {
        _logger = logger;
        _dbConnectionFactory = dbConnectionFactory;
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
                if (_dbConnectionFactory != null)
                {
                    try
                    {
                        using var conn = _dbConnectionFactory.CreateConnection();
                        using var cmd = conn.CreateCommand();
                        cmd.CommandText = "PRAGMA wal_checkpoint(PASSIVE); PRAGMA shrink_memory;";
                        cmd.ExecuteNonQuery();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "SQLite bellek kırpma veya checkpoint sırasında geçici hata.");
                    }
                }

                SqliteConnection.ClearAllPools();
                GC.Collect(2, GCCollectionMode.Optimized, blocking: false);
                NativeMemoryTrimmer.Trim();
                _logger.LogDebug("Periyodik bellek kırpma tamamlandı (Sqlite shrink & checkpoint yapıldı, pool temizlendi, Gen2 non-blocking GC ve Native trim tetiklendi).");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bellek kırpma işlemi sırasında hata oluştu.");
            }
        }

        _logger.LogInformation("MemoryTrimmerBackgroundService durduruldu.");
    }
}
