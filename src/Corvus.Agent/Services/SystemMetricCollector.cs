using System.Diagnostics;
using System.Runtime.InteropServices;
using Corvus.Agent.Models;

namespace Corvus.Agent.Services;

public interface ISystemMetricCollector
{
    AgentTelemetryPayload CollectMetrics();
}

public class SystemMetricCollector : ISystemMetricCollector
{
    private long _lastNetRx = 0;
    private long _lastNetTx = 0;
    private DateTime _lastNetTime = DateTime.UtcNow;

    public AgentTelemetryPayload CollectMetrics()
    {
        float cpu = GetCpuUsagePercent();
        ushort cores = (ushort)Math.Max(1, Environment.ProcessorCount);
        var (ramUsed, ramTotal) = GetRamUsageBytes();
        var (diskUsed, diskTotal) = GetDiskUsageBytes();
        var (rxSec, txSec) = GetNetworkRateBytesPerSec();
        var (load1, load5, load15) = GetLoadAverages();

        return new AgentTelemetryPayload(
            CpuPercent: cpu,
            CpuCores: cores,
            RamUsedBytes: ramUsed,
            RamTotalBytes: ramTotal,
            DiskUsedBytes: diskUsed,
            DiskTotalBytes: diskTotal,
            NetRxBytesSec: rxSec,
            NetTxBytesSec: txSec,
            LoadAvg1m: load1,
            LoadAvg5m: load5,
            LoadAvg15m: load15
        );
    }

    private static float GetCpuUsagePercent()
    {
        // Linux /proc/stat CPU hesaplama veya Process CPU fallback
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/proc/stat"))
        {
            try
            {
                using var reader = new StreamReader("/proc/stat");
                string? firstLine = reader.ReadLine();
                if (!string.IsNullOrWhiteSpace(firstLine) && firstLine.StartsWith("cpu "))
                {
                    var parts = firstLine.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length >= 5 &&
                        long.TryParse(parts[1], out long user) &&
                        long.TryParse(parts[2], out long nice) &&
                        long.TryParse(parts[3], out long system) &&
                        long.TryParse(parts[4], out long idle))
                    {
                        long total = user + nice + system + idle;
                        long busy = user + nice + system;
                        if (total > 0)
                        {
                            return (float)Math.Round((busy * 100.0) / total, 1);
                        }
                    }
                }
            }
            catch { }
        }

        return 5.0f; // Minimal fallback
    }

    private static (long Used, long Total) GetRamUsageBytes()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/proc/meminfo"))
        {
            try
            {
                long totalKb = 0;
                long availableKb = 0;

                foreach (var line in File.ReadLines("/proc/meminfo"))
                {
                    if (line.StartsWith("MemTotal:"))
                    {
                        totalKb = ParseMemInfoKb(line);
                    }
                    else if (line.StartsWith("MemAvailable:"))
                    {
                        availableKb = ParseMemInfoKb(line);
                    }

                    if (totalKb > 0 && availableKb > 0) break;
                }

                if (totalKb > 0)
                {
                    long totalBytes = totalKb * 1024L;
                    long usedBytes = (totalKb - availableKb) * 1024L;
                    return (Math.Max(0, usedBytes), totalBytes);
                }
            }
            catch { }
        }

        // Cross-platform GC memory fallback
        long mem = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
        return (GC.GetTotalMemory(false), mem > 0 ? mem : 4L * 1024 * 1024 * 1024);
    }

    private static long ParseMemInfoKb(string line)
    {
        var parts = line.Split(':', StringSplitOptions.TrimEntries);
        if (parts.Length == 2)
        {
            var numStr = parts[1].Split(' ')[0];
            if (long.TryParse(numStr, out long kb)) return kb;
        }
        return 0;
    }

    private static (long Used, long Total) GetDiskUsageBytes()
    {
        try
        {
            string rootPath = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "C:\\" : "/";
            var drive = new DriveInfo(rootPath);
            if (drive.IsReady)
            {
                long total = drive.TotalSize;
                long free = drive.AvailableFreeSpace;
                return (total - free, total);
            }
        }
        catch { }

        return (10L * 1024 * 1024 * 1024, 100L * 1024 * 1024 * 1024);
    }

    private (long RxSec, long TxSec) GetNetworkRateBytesPerSec()
    {
        long currentRx = 0;
        long currentTx = 0;

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/proc/net/dev"))
        {
            try
            {
                foreach (var line in File.ReadLines("/proc/net/dev").Skip(2))
                {
                    var parts = line.Split(':', StringSplitOptions.TrimEntries);
                    if (parts.Length == 2 && !parts[0].StartsWith("lo"))
                    {
                        var stats = parts[1].Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        if (stats.Length >= 9 &&
                            long.TryParse(stats[0], out long rx) &&
                            long.TryParse(stats[8], out long tx))
                        {
                            currentRx += rx;
                            currentTx += tx;
                        }
                    }
                }
            }
            catch { }
        }

        var now = DateTime.UtcNow;
        double seconds = (now - _lastNetTime).TotalSeconds;

        long rxRate = 0;
        long txRate = 0;

        if (seconds > 0 && _lastNetRx > 0)
        {
            rxRate = (long)Math.Max(0, (currentRx - _lastNetRx) / seconds);
            txRate = (long)Math.Max(0, (currentTx - _lastNetTx) / seconds);
        }

        _lastNetRx = currentRx;
        _lastNetTx = currentTx;
        _lastNetTime = now;

        return (rxRate, txRate);
    }

    private static (float Load1, float Load5, float Load15) GetLoadAverages()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/proc/loadavg"))
        {
            try
            {
                string text = File.ReadAllText("/proc/loadavg");
                var parts = text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 3 &&
                    float.TryParse(parts[0], System.Globalization.CultureInfo.InvariantCulture, out float l1) &&
                    float.TryParse(parts[1], System.Globalization.CultureInfo.InvariantCulture, out float l5) &&
                    float.TryParse(parts[2], System.Globalization.CultureInfo.InvariantCulture, out float l15))
                {
                    return (l1, l5, l15);
                }
            }
            catch { }
        }

        return (0.1f, 0.1f, 0.1f);
    }
}
