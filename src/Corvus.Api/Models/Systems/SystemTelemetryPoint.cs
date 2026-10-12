using System.Runtime.InteropServices;

namespace Corvus.Api.Models.Systems;

/// <summary>
/// In-Memory Ring Buffer icinde saklanan, 120-baytlik unmanaged / readonly struct telemetri noktasi.
/// GC yukunu sifirlamak ve 50 dugumde bellek kullanimini 360 KB altinda tutmak icin tasarlanmistir.
/// </summary>
[StructLayout(LayoutKind.Sequential, Pack = 8)]
public readonly struct SystemTelemetryPoint
{
    public readonly long TimestampUnixSeconds;   // 8 bytes
    public readonly float CpuPercent;            // 4 bytes
    public readonly ushort CpuCores;             // 2 bytes
    public readonly ushort Padding1;             // 2 bytes
    public readonly long RamUsedBytes;           // 8 bytes
    public readonly long RamTotalBytes;          // 8 bytes
    public readonly long DiskUsedBytes;          // 8 bytes
    public readonly long DiskTotalBytes;         // 8 bytes
    public readonly long NetRxBytesSec;          // 8 bytes
    public readonly long NetTxBytesSec;          // 8 bytes
    public readonly float LoadAvg1m;             // 4 bytes
    public readonly float LoadAvg5m;             // 4 bytes
    public readonly float LoadAvg15m;            // 4 bytes
    public readonly uint Flags;                  // 4 bytes
    public readonly long Reserved1;              // 8 bytes
    public readonly long Reserved2;              // 8 bytes
    public readonly long Reserved3;              // 8 bytes
    public readonly long Reserved4;              // 8 bytes
    public readonly long Reserved5;              // 8 bytes
    // Toplam: 8 + 4 + 2 + 2 + (7 * 8) + (3 * 4) + 4 + (5 * 8) = 16 + 56 + 12 + 4 + 40 = 128 bytes (veya 120-128B hizalamasi)

    public SystemTelemetryPoint(
        long timestampUnixSeconds,
        float cpuPercent,
        ushort cpuCores,
        long ramUsedBytes,
        long ramTotalBytes,
        long diskUsedBytes,
        long diskTotalBytes,
        long netRxBytesSec,
        long netTxBytesSec,
        float loadAvg1m,
        float loadAvg5m,
        float loadAvg15m,
        uint flags = 0)
    {
        TimestampUnixSeconds = timestampUnixSeconds;
        CpuPercent = cpuPercent;
        CpuCores = cpuCores;
        Padding1 = 0;
        RamUsedBytes = ramUsedBytes;
        RamTotalBytes = ramTotalBytes;
        DiskUsedBytes = diskUsedBytes;
        DiskTotalBytes = diskTotalBytes;
        NetRxBytesSec = netRxBytesSec;
        NetTxBytesSec = netTxBytesSec;
        LoadAvg1m = loadAvg1m;
        LoadAvg5m = loadAvg5m;
        LoadAvg15m = loadAvg15m;
        Flags = flags;
        Reserved1 = 0;
        Reserved2 = 0;
        Reserved3 = 0;
        Reserved4 = 0;
        Reserved5 = 0;
    }
}
