using Corvus.Api.Data;
using Corvus.Api.Utils;

namespace Corvus.Api.BackgroundServices;

public class RetentionCleanupService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<RetentionCleanupService> _logger;

    public RetentionCleanupService(IServiceProvider services, ILogger<RetentionCleanupService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RetentionCleanupService başlatıldı.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var settingsRepo = scope.ServiceProvider.GetRequiredService<ISettingsRepository>();
                var metricsRepo = scope.ServiceProvider.GetRequiredService<IMetricsRepository>();
                var uptimeRepo = scope.ServiceProvider.GetRequiredService<IUptimeRepository>();
                var dbFactory = scope.ServiceProvider.GetService<IDbConnectionFactory>();

                // 1. Veritabanındaki ayarı oku (yoksa ortam değişkeni veya varsayılan 30)
                int retentionDays = 30;
                string? rawDays = await settingsRepo.GetAsync("retention_days");
                if (!string.IsNullOrWhiteSpace(rawDays) && int.TryParse(rawDays, out int parsed))
                {
                    retentionDays = parsed;
                }
                else
                {
                    string? envRetention = Environment.GetEnvironmentVariable("CORVUS_METRICS_RETENTION_DAYS");
                    if (int.TryParse(envRetention, out int envVal)) retentionDays = envVal;
                }

                // 2. 0 veya negatif ise Sınırsız mod — temizleme yapma
                if (retentionDays > 0)
                {
                    _logger.LogInformation("Eski metrik ve uptime kayıtları temizleniyor ({Days} gün)...", retentionDays);
                    await uptimeRepo.AggregateDailyStatsAsync();
                    await metricsRepo.CleanupOldAsync(retentionDays);
                    await uptimeRepo.CleanupOldAsync(retentionDays);

                    // SQLite sorgu planlayıcısı istatistiklerini güncelle
                    if (dbFactory != null)
                    {
                        try
                        {
                            using var conn = dbFactory.CreateConnection();
                            using var cmd = conn.CreateCommand();
                            cmd.CommandText = "PRAGMA optimize;";
                            cmd.ExecuteNonQuery();
                        }
                        catch
                        {
                            // Optimize hata verse bile ana akışı kesme
                        }
                    }

                    _logger.LogInformation("Eski kayıtların temizliği tamamlandı.");

                    // Bellek optimizasyonu: Serbest kalan eski kayıt tamponlarını temizle
                    GC.Collect(2, GCCollectionMode.Optimized, blocking: false);
                    NativeMemoryTrimmer.Trim();
                }
                else
                {
                    _logger.LogInformation("Veri saklama süresi 'Sınırsız' (0) olarak ayarlı. Temizlik adımı atlandı.");
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Retention temizliği sırasında hata oluştu.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("RetentionCleanupService durduruldu.");
    }
}
