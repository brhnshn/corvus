using Corvus.Api.BackgroundServices;
using Corvus.Api.Data;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services.Systems;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class MetricsBatchFlusherTests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly ServiceProvider _serviceProvider;
    private readonly ISystemMetricRepository _metricRepo;

    public MetricsBatchFlusherTests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_flusher_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        var dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(dbFactory, NullLogger.Instance);

        using (var conn = dbFactory.CreateConnection())
        {
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "INSERT INTO systems (id, name, status, created_at, updated_at) VALUES ('local-host', 'Local Host', 'online', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');";
            cmd.ExecuteNonQuery();
        }

        var services = new ServiceCollection();
        services.AddSingleton<IDbConnectionFactory>(dbFactory);
        services.AddScoped<ISystemMetricRepository, SystemMetricRepository>();

        _serviceProvider = services.BuildServiceProvider();
        _metricRepo = _serviceProvider.GetRequiredService<ISystemMetricRepository>();
    }

    [Fact]
    public async Task StopAsync_Flushes_Buffered_Telemetry_To_Database_On_Graceful_Shutdown()
    {
        var ringBuffer = new TelemetryRingBuffer();
        string systemId = "local-host";

        // 3 adet telemetri noktası arabelleğe eklenir (normalde 60s periyotta kaydedilecek)
        for (int i = 1; i <= 3; i++)
        {
            var point = new SystemTelemetryPoint(
                timestampUnixSeconds: 1700000000 + i,
                cpuPercent: 25.0f * i,
                cpuCores: 4,
                ramUsedBytes: 2048L * 1024L * 1024L,
                ramTotalBytes: 8192L * 1024L * 1024L,
                diskUsedBytes: 50L * 1024L * 1024L * 1024L,
                diskTotalBytes: 100L * 1024L * 1024L * 1024L,
                netRxBytesSec: 1024,
                netTxBytesSec: 512,
                loadAvg1m: 0.5f,
                loadAvg5m: 0.4f,
                loadAvg15m: 0.3f
            );
            ringBuffer.Push(systemId, in point);
        }

        // Kapanış öncesi veritabanında henüz 1m metriği bulunmamalıdır
        var beforeFlush = await _metricRepo.Get1mHistoryAsync(systemId, "1970-01-01T00:00:00Z", 10);
        Assert.Empty(beforeFlush);

        // Arka plan servisi örneği oluşturulur
        var flusher = new MetricsBatchFlusherBackgroundService(
            ringBuffer,
            _serviceProvider,
            NullLogger<MetricsBatchFlusherBackgroundService>.Instance
        );

        // SIGTERM / Graceful shutdown simülasyonu: StopAsync çağrılır
        await flusher.StopAsync(CancellationToken.None);

        // Kapanış sonrası arabellekteki veriler veritabanına eksiksiz yazılmış olmalıdır
        var afterFlush = await _metricRepo.Get1mHistoryAsync(systemId, "1970-01-01T00:00:00Z", 10);
        Assert.NotEmpty(afterFlush);
        Assert.Single(afterFlush);
        Assert.Equal(systemId, afterFlush[0].SystemId);
        // Ortalama CPU: (25 + 50 + 75) / 3 = 50.0%
        Assert.Equal(50.0, afterFlush[0].CpuPercent, 1);
    }

    public void Dispose()
    {
        _serviceProvider.Dispose();
        try
        {
            if (Directory.Exists(_tempDbDir))
            {
                Directory.Delete(_tempDbDir, true);
            }
        }
        catch { }
    }
}
