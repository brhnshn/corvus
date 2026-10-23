using System.Diagnostics;
using System.Runtime.InteropServices;
using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.BackgroundServices;

// Platforma özel ana makine ölçümleri: ağ hızı, load average, CPU yüzdesi (Linux /proc ve Windows GetSystemTimes)
public partial class SystemMetricsCollector
{
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

        return (0.0f, 0.0f, 0.0f);
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
