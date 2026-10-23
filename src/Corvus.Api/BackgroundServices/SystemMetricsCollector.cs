using System.Diagnostics;
using System.Runtime.InteropServices;
using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.BackgroundServices;

public partial class SystemMetricsCollector : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<SystemMetricsCollector> _logger;
    private TimeSpan _prevCpuTime = TimeSpan.Zero;
    private DateTime _prevCpuCheck = DateTime.UtcNow;
    private long _prevTotalJiffies = 0;
    private long _prevIdleJiffies = 0;

    public SystemMetricsCollector(IServiceProvider services, ILogger<SystemMetricsCollector> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SystemMetricsCollector başlatıldı (Periyot: 15sn).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<IMetricsRepository>();

                var (rxSec, txSec) = GetNetworkRateBytesPerSec();
                var (load1, load5, load15) = GetLoadAverages();

                var metric = CollectMetrics(rxSec, txSec);
                await repo.InsertAsync(metric);

                // Yerel Sunucuyu (Host Node) Systems Filosuna Entegre Et
                var ringBuffer = scope.ServiceProvider.GetRequiredService<Corvus.Api.Services.Systems.ITelemetryRingBuffer>();
                var sysRepo = scope.ServiceProvider.GetRequiredService<ISystemRepository>();

                long nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                string nowIso = DateTime.UtcNow.ToString("o");

                long ramUsedBytes = metric.RamUsedMb * 1024L * 1024L;
                long ramTotalBytes = metric.RamTotalMb * 1024L * 1024L;
                long diskUsedBytes = metric.DiskUsedGb * 1024L * 1024L * 1024L;
                long diskTotalBytes = metric.DiskTotalGb * 1024L * 1024L * 1024L;

                var point = new Corvus.Api.Models.Systems.SystemTelemetryPoint(
                    timestampUnixSeconds: nowUnix,
                    cpuPercent: (float)metric.CpuPercent,
                    cpuCores: (ushort)Math.Max(1, Environment.ProcessorCount),
                    ramUsedBytes: ramUsedBytes,
                    ramTotalBytes: ramTotalBytes,
                    diskUsedBytes: diskUsedBytes,
                    diskTotalBytes: diskTotalBytes,
                    netRxBytesSec: rxSec,
                    netTxBytesSec: txSec,
                    loadAvg1m: load1,
                    loadAvg5m: load5,
                    loadAvg15m: load15
                );

                ringBuffer.Push("local-host", in point);

                var existingHost = await sysRepo.GetByIdAsync("local-host");
                if (existingHost == null)
                {
                    await sysRepo.CreateAsync(new Corvus.Api.Models.Systems.SystemEntity
                    {
                        Id = "local-host",
                        Name = "Yerel Sunucu (Host)",
                        Hostname = Environment.MachineName,
                        IpAddress = "127.0.0.1",
                        OsInfo = RuntimeInformation.OSDescription,
                        AgentVersion = "embedded",
                        TagsJson = "[\"host\",\"core\"]",
                        Status = "online",
                        CreatedAt = nowIso,
                        UpdatedAt = nowIso,
                        LastSeenAt = nowIso
                    });
                }
                else
                {
                    await sysRepo.UpdateStatusAsync("local-host", "online", nowIso);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Sistem metrikleri toplanırken hata oluştu.");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("SystemMetricsCollector durduruldu.");
    }

    private long _lastNetRx = 0;
    private long _lastNetTx = 0;
    private DateTime _lastNetTime = DateTime.UtcNow;

    private SystemMetric CollectMetrics(long netRxSec = 0, long netTxSec = 0)
    {
        // CPU hesabı
        double cpuPercent = GetHostCpuPercent();

        // RAM hesabı
        long ramUsedMb = 0;
        long ramTotalMb = 0;

        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/proc/meminfo"))
            {
                long memTotalKb = 0;
                long memAvailKb = 0;

                using (var sr = new StreamReader("/proc/meminfo"))
                {
                    while (sr.ReadLine() is { } line)
                    {
                        if (line.StartsWith("MemTotal:"))
                        {
                            memTotalKb = ParseMemInfoKb(line);
                        }
                        else if (line.StartsWith("MemAvailable:"))
                        {
                            memAvailKb = ParseMemInfoKb(line);
                        }

                        if (memTotalKb > 0 && memAvailKb > 0)
                        {
                            break;
                        }
                    }
                }

                ramTotalMb = memTotalKb / 1024;
                ramUsedMb = (memTotalKb - memAvailKb) / 1024;
            }
            else
            {
                // Windows fallback
                var gcMemory = GC.GetGCMemoryInfo();
                ramTotalMb = gcMemory.TotalAvailableMemoryBytes / (1024 * 1024);
                ramUsedMb = gcMemory.MemoryLoadBytes / (1024 * 1024);
                if (ramUsedMb <= 0)
                {
                    using var curProc = Process.GetCurrentProcess();
                    ramUsedMb = curProc.WorkingSet64 / (1024 * 1024);
                }
            }
        }
        catch
        {
            ramTotalMb = 0;
            ramUsedMb = 0;
        }

        // Disk hesabı (Linux kök dosya sistemi veya en büyük hazır disk)
        long diskUsedGb = 0;
        long diskTotalGb = 0;

        try
        {
            DriveInfo? drive = null;
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                try
                {
                    var rootDrive = new DriveInfo("/");
                    if (rootDrive.IsReady && rootDrive.TotalSize > 0)
                    {
                        drive = rootDrive;
                    }
                }
                catch { }
            }

            drive ??= DriveInfo.GetDrives()
                .Where(d => d.IsReady && d.TotalSize > 0)
                .OrderByDescending(d => d.TotalSize)
                .FirstOrDefault();

            if (drive != null && drive.TotalSize > 0)
            {
                diskTotalGb = drive.TotalSize / (1024 * 1024 * 1024);
                diskUsedGb = (drive.TotalSize - drive.AvailableFreeSpace) / (1024 * 1024 * 1024);
            }
        }
        catch
        {
            diskTotalGb = 0;
            diskUsedGb = 0;
        }

        return new SystemMetric
        {
            RecordedAt = DateTime.UtcNow.ToString("o"),
            CpuPercent = Math.Clamp(cpuPercent, 0, 100),
            RamUsedMb = ramUsedMb,
            RamTotalMb = ramTotalMb,
            DiskUsedGb = diskUsedGb,
            DiskTotalGb = diskTotalGb,
            NetworkRxBytes = netRxSec,
            NetworkTxBytes = netTxSec
        };
    }

    private ulong _prevWinIdle = 0;
    private ulong _prevWinKernel = 0;
    private ulong _prevWinUser = 0;
}
