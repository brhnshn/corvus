using System.Diagnostics;
using System.Runtime.InteropServices;
using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.BackgroundServices;

public class SystemMetricsCollector : BackgroundService
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

                var metric = CollectMetrics();
                await repo.InsertAsync(metric);
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

    private SystemMetric CollectMetrics()
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

                foreach (var line in File.ReadLines("/proc/meminfo"))
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
            ramTotalMb = 4096;
            ramUsedMb = 1024;
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
            diskTotalGb = 50;
            diskUsedGb = 15;
        }

        return new SystemMetric
        {
            RecordedAt = DateTime.UtcNow.ToString("o"),
            CpuPercent = Math.Clamp(cpuPercent, 0, 100),
            RamUsedMb = ramUsedMb,
            RamTotalMb = ramTotalMb > 0 ? ramTotalMb : 4096,
            DiskUsedGb = diskUsedGb,
            DiskTotalGb = diskTotalGb > 0 ? diskTotalGb : 50,
            NetworkRxBytes = 0,
            NetworkTxBytes = 0
        };
    }

    private double GetHostCpuPercent()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/proc/stat"))
        {
            try
            {
                var firstLine = File.ReadLines("/proc/stat").FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(firstLine) && firstLine.StartsWith("cpu "))
                {
                    var parts = firstLine.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length > 4)
                    {
                        long user = long.Parse(parts[1]);
                        long nice = long.Parse(parts[2]);
                        long system = long.Parse(parts[3]);
                        long idle = long.Parse(parts[4]);
                        long iowait = parts.Length > 5 ? long.Parse(parts[5]) : 0;
                        long irq = parts.Length > 6 ? long.Parse(parts[6]) : 0;
                        long softirq = parts.Length > 7 ? long.Parse(parts[7]) : 0;
                        long steal = parts.Length > 8 ? long.Parse(parts[8]) : 0;

                        long totalJiffies = user + nice + system + idle + iowait + irq + softirq + steal;
                        long idleJiffies = idle + iowait;

                        long diffTotal = totalJiffies - _prevTotalJiffies;
                        long diffIdle = idleJiffies - _prevIdleJiffies;

                        _prevTotalJiffies = totalJiffies;
                        _prevIdleJiffies = idleJiffies;

                        if (diffTotal > 0 && diffIdle >= 0 && _prevTotalJiffies > 0)
                        {
                            double usage = (1.0 - (double)diffIdle / diffTotal) * 100.0;
                            return Math.Round(Math.Clamp(usage, 0.0, 100.0), 1);
                        }
                    }
                }
            }
            catch
            {
                // Fallback below
            }
        }

        // Windows: kernel32.dll -> GetSystemTimes (Gerçek makine CPU kullanımı)
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                if (GetSystemTimes(out var idleTime, out var kernelTime, out var userTime))
                {
                    ulong idle = FileTimeToUInt64(idleTime);
                    ulong kernel = FileTimeToUInt64(kernelTime);
                    ulong user = FileTimeToUInt64(userTime);

                    if (_prevWinKernel > 0 && _prevWinUser > 0)
                    {
                        ulong kernelDiff = kernel - _prevWinKernel;
                        ulong userDiff = user - _prevWinUser;
                        ulong idleDiff = idle - _prevWinIdle;
                        ulong totalDiff = kernelDiff + userDiff; // kernelTime includes idle in Windows

                        if (totalDiff > 0 && totalDiff >= idleDiff)
                        {
                            double usage = (1.0 - (double)idleDiff / totalDiff) * 100.0;
                            _prevWinIdle = idle;
                            _prevWinKernel = kernel;
                            _prevWinUser = user;
                            return Math.Round(Math.Clamp(usage, 0.0, 100.0), 1);
                        }
                    }

                    _prevWinIdle = idle;
                    _prevWinKernel = kernel;
                    _prevWinUser = user;
                }
            }
            catch
            {
                // Fallback below
            }
        }

        // Genel Fallback (macOS veya P/Invoke erişilemediğinde)
        double cpuPercent = 0.0;
        try
        {
            using var proc = Process.GetCurrentProcess();
            var curCpuTime = proc.TotalProcessorTime;
            var curTime = DateTime.UtcNow;

            var timeDiff = (curTime - _prevCpuCheck).TotalMilliseconds;
            var cpuDiff = (curCpuTime - _prevCpuTime).TotalMilliseconds;

            if (timeDiff > 0 && _prevCpuTime != TimeSpan.Zero)
            {
                cpuPercent = Math.Round((cpuDiff / (timeDiff * Environment.ProcessorCount)) * 100.0, 1);
            }

            _prevCpuTime = curCpuTime;
            _prevCpuCheck = curTime;
        }
        catch
        {
            // fallback
        }

        return cpuPercent;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetSystemTimes(
        out System.Runtime.InteropServices.ComTypes.FILETIME lpIdleTime, 
        out System.Runtime.InteropServices.ComTypes.FILETIME lpKernelTime, 
        out System.Runtime.InteropServices.ComTypes.FILETIME lpUserTime);

    private static ulong FileTimeToUInt64(System.Runtime.InteropServices.ComTypes.FILETIME ft)
    {
        return ((ulong)(uint)ft.dwHighDateTime << 32) | (uint)ft.dwLowDateTime;
    }

    private ulong _prevWinIdle = 0;
    private ulong _prevWinKernel = 0;
    private ulong _prevWinUser = 0;

    private static long ParseMemInfoKb(string line)
    {
        var parts = line.Split(':', StringSplitOptions.TrimEntries);
        if (parts.Length > 1)
        {
            var valPart = parts[1].Replace("kB", "").Trim();
            if (long.TryParse(valPart, out long val))
            {
                return val;
            }
        }
        return 0;
    }
}
