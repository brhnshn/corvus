using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

// Konteyner log okuma ve CPU/RAM/Ağ istatistik hesaplama
public partial class DockerContainerClient
{
    public async Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/{Uri.EscapeDataString(containerId)}/logs?stdout=true&stderr=true&timestamps=true&tail={tail}";
            using var response = await _transport.HttpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker container logs API hata döndü: {StatusCode}", response.StatusCode);
                return new List<string>();
            }

            byte[] bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            return DockerLogDemuxer.Demux(bytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container logları alınamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new List<string>();
        }
    }

    public async Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/{Uri.EscapeDataString(containerId)}/stats?stream=false";
            using var response = await _transport.HttpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = doc.RootElement;

            long cpuTotal = 0;
            long systemCpu = 0;
            int onlineCpus = 1;

            if (root.TryGetProperty("cpu_stats", out var cpuStats))
            {
                if (cpuStats.TryGetProperty("cpu_usage", out var cpuUsage) && cpuUsage.TryGetProperty("total_usage", out var tu))
                {
                    cpuTotal = tu.GetInt64();
                }
                if (cpuStats.TryGetProperty("system_cpu_usage", out var scu))
                {
                    systemCpu = scu.GetInt64();
                }
                if (cpuStats.TryGetProperty("online_cpus", out var oc))
                {
                    onlineCpus = Math.Max(1, oc.GetInt32());
                }
            }

            double cpuPercent = 0.0;
            bool calculated = false;

            if (_cpuHistory.TryGetValue(containerId, out var prev))
            {
                long cpuDelta = cpuTotal - prev.CpuTotal;
                long systemDelta = systemCpu - prev.SystemCpu;
                if (systemDelta > 0 && cpuDelta >= 0)
                {
                    cpuPercent = Math.Round(((double)cpuDelta / systemDelta) * onlineCpus * 100.0, 2);
                    calculated = true;
                }
            }

            _cpuHistory[containerId] = (cpuTotal, systemCpu, DateTime.UtcNow);

            if (!calculated && systemCpu > 0)
            {
                try
                {
                    await Task.Delay(100, cancellationToken);
                    using var secondResponse = await _transport.HttpClient.GetAsync(url, cancellationToken);
                    if (secondResponse.IsSuccessStatusCode)
                    {
                        using var secondStream = await secondResponse.Content.ReadAsStreamAsync(cancellationToken);
                        using var secondDoc = await JsonDocument.ParseAsync(secondStream, cancellationToken: cancellationToken);
                        var secondRoot = secondDoc.RootElement;
                        if (secondRoot.TryGetProperty("cpu_stats", out var secondCpuStats))
                        {
                            long secondCpuTotal = 0;
                            long secondSystemCpu = 0;
                            if (secondCpuStats.TryGetProperty("cpu_usage", out var secondUsage) && secondUsage.TryGetProperty("total_usage", out var stu))
                            {
                                secondCpuTotal = stu.GetInt64();
                            }
                            if (secondCpuStats.TryGetProperty("system_cpu_usage", out var sscu))
                            {
                                secondSystemCpu = sscu.GetInt64();
                            }

                            if (secondSystemCpu > systemCpu && secondCpuTotal >= cpuTotal)
                            {
                                long cDelta = secondCpuTotal - cpuTotal;
                                long sDelta = secondSystemCpu - systemCpu;
                                cpuPercent = Math.Round(((double)cDelta / sDelta) * onlineCpus * 100.0, 2);
                                _cpuHistory[containerId] = (secondCpuTotal, secondSystemCpu, DateTime.UtcNow);
                            }
                        }
                    }
                }
                catch { }
            }

            long memUsage = 0;
            long memLimit = 0;
            if (root.TryGetProperty("memory_stats", out var memStats))
            {
                if (memStats.TryGetProperty("usage", out var mu)) memUsage = mu.GetInt64();
                if (memStats.TryGetProperty("limit", out var ml)) memLimit = ml.GetInt64();
            }

            double memPercent = memLimit > 0 ? Math.Round(((double)memUsage / memLimit) * 100.0, 2) : 0.0;

            long netRx = 0;
            long netTx = 0;
            if (root.TryGetProperty("networks", out var networks) && networks.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in networks.EnumerateObject())
                {
                    if (prop.Value.TryGetProperty("rx_bytes", out var rx)) netRx += rx.GetInt64();
                    if (prop.Value.TryGetProperty("tx_bytes", out var tx)) netTx += tx.GetInt64();
                }
            }

            if (_cpuHistory.Count > 100)
            {
                var threshold = DateTime.UtcNow.AddMinutes(-5);
                foreach (var kvp in _cpuHistory)
                {
                    if (kvp.Value.Timestamp < threshold)
                    {
                        _cpuHistory.TryRemove(kvp.Key, out _);
                    }
                }
            }

            return new ContainerStatsDto(
                ContainerId: containerId,
                CpuPercent: cpuPercent,
                MemoryUsageBytes: memUsage,
                MemoryLimitBytes: memLimit,
                MemoryPercent: memPercent,
                NetworkRxBytes: netRx,
                NetworkTxBytes: netTx
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Container stats bilgisi alınamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return null;
        }
    }
}
