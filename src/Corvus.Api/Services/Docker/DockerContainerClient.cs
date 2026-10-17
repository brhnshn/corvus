using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

public class DockerContainerClient
{
    private readonly IDockerHttpTransport _transport;
    private readonly ILogger<DockerHttpClient> _logger;
    private readonly ConcurrentDictionary<string, (long CpuTotal, long SystemCpu, DateTime Timestamp)> _cpuHistory = new(StringComparer.OrdinalIgnoreCase);

    public DockerContainerClient(IDockerHttpTransport transport, ILogger<DockerHttpClient> logger)
    {
        _transport = transport;
        _logger = logger;
    }

    public async Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/json?all={(all ? "true" : "false")}";
            using var response = await _transport.HttpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker containers API hata döndü: {StatusCode}", response.StatusCode);
                return new List<DockerContainerInfo>();
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var result = await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.ListDockerContainerInfo, cancellationToken);
            return result ?? new List<DockerContainerInfo>();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Docker container listesi alınamadı.");
            return new List<DockerContainerInfo>();
        }
    }

    public async Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.GetAsync($"/containers/{Uri.EscapeDataString(containerId)}/json", cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerContainerInspectInfo, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Container inspect alınamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return null;
        }
    }

    public async Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/restart", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container yeniden başlatıldı.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Container yeniden başlatılamadı.");
            _logger.LogWarning("Docker restart hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container yeniden başlatılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/start", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container başlatıldı.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                return new DockerActionResult(true, "Container zaten çalışıyor.", 200);
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Container başlatılamadı.");
            _logger.LogWarning("Docker start hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container başlatılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/stop", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container durduruldu.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                return new DockerActionResult(true, "Container zaten durmuş.", 200);
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Container durdurulamadı.");
            _logger.LogWarning("Docker stop hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container durdurulamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/pause", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container duraklatıldı.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Container duraklatılamadı.");
            _logger.LogWarning("Docker pause hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container duraklatılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/unpause", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container devam ettirildi.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Container devam ettirilemedi.");
            _logger.LogWarning("Docker unpause hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container devam ettirilemedi: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> DeleteContainerAsync(string containerId, bool force = false, bool removeVolumes = false, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/{Uri.EscapeDataString(containerId)}?force={(force ? "true" : "false")}&v={(removeVolumes ? "true" : "false")}";
            using var response = await _transport.HttpClient.DeleteAsync(url, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container silindi.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Container silinemedi.");
            _logger.LogWarning("Docker container silme hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container silinemedi: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> UpdateContainerAsync(string containerId, DockerContainerUpdateRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            string jsonBody = JsonSerializer.Serialize(request, CorvusJsonSerializerContext.Default.DockerContainerUpdateRequest);
            using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/update", content, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Konteyner kaynak limitleri başarıyla güncellendi.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner limitleri güncellenemedi.");
            _logger.LogWarning("Docker update hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner limitleri güncellenemedi: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> UpdateContainerConfigAsync(string containerId, ContainerResourceUpdateRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(containerId))
        {
            return new DockerActionResult(false, "Container ID boş olamaz.", 400);
        }

        if (request == null)
        {
            return new DockerActionResult(false, "Güncelleme isteği boş olamaz.", 400);
        }

        if (request.CpuCores.HasValue && request.CpuCores.Value < 0)
        {
            return new DockerActionResult(false, "CPU çekirdek değeri 0 veya daha büyük olmalıdır.", 400);
        }

        if (request.MemoryMb.HasValue)
        {
            if (request.MemoryMb.Value < 0)
            {
                return new DockerActionResult(false, "Bellek değeri 0 veya daha büyük olmalıdır.", 400);
            }
            if (request.MemoryMb.Value > 0 && request.MemoryMb.Value < 6)
            {
                return new DockerActionResult(false, "Minimum bellek sınırı 6 MB olmalıdır (veya sınırsız için 0).", 400);
            }
        }

        string? restartPolicyName = null;
        int maxRetries = request.MaximumRetryCount ?? 0;
        if (!string.IsNullOrWhiteSpace(request.RestartPolicy))
        {
            restartPolicyName = request.RestartPolicy.Trim().ToLowerInvariant();
            var validPolicies = new[] { "no", "always", "unless-stopped", "on-failure" };
            if (!validPolicies.Contains(restartPolicyName))
            {
                return new DockerActionResult(false, "Geçersiz yeniden başlatma politikası. Geçerli değerler: no, always, unless-stopped, on-failure", 400);
            }

            if (restartPolicyName == "on-failure" && maxRetries < 0)
            {
                return new DockerActionResult(false, "Maksimum yeniden deneme sayısı 0 veya daha büyük olmalıdır.", 400);
            }
        }

        var dockerReq = new DockerContainerUpdateRequest();

        if (request.CpuCores.HasValue)
        {
            dockerReq.NanoCpus = request.CpuCores.Value <= 0 ? 0 : (long)Math.Round(request.CpuCores.Value * 1_000_000_000);
        }

        if (request.MemoryMb.HasValue)
        {
            if (request.MemoryMb.Value <= 0)
            {
                dockerReq.Memory = 0;
                dockerReq.MemorySwap = 0;
            }
            else
            {
                long memoryBytes = request.MemoryMb.Value * 1024L * 1024L;
                dockerReq.Memory = memoryBytes;
                dockerReq.MemorySwap = request.MemorySwapMb.HasValue
                    ? (request.MemorySwapMb.Value <= 0 ? -1 : request.MemorySwapMb.Value * 1024L * 1024L)
                    : -1;
            }
        }

        if (!string.IsNullOrWhiteSpace(restartPolicyName))
        {
            dockerReq.RestartPolicy = new DockerRestartPolicy
            {
                Name = restartPolicyName,
                MaximumRetryCount = restartPolicyName == "on-failure" ? maxRetries : 0
            };
        }

        var result = await UpdateContainerAsync(containerId, dockerReq, cancellationToken);
        if (!result.Success && dockerReq.Memory.HasValue && dockerReq.Memory.Value > 0)
        {
            if (dockerReq.MemorySwap == -1)
            {
                dockerReq.MemorySwap = dockerReq.Memory.Value * 2;
                var retryResult = await UpdateContainerAsync(containerId, dockerReq, cancellationToken);
                if (retryResult.Success)
                {
                    return retryResult;
                }
            }

            // Fallback: If kernel lacks swap accounting or host cgroup rejects swap, attempt without MemorySwap
            dockerReq.MemorySwap = null;
            var noSwapResult = await UpdateContainerAsync(containerId, dockerReq, cancellationToken);
            if (noSwapResult.Success)
            {
                return noSwapResult;
            }
        }

        return result;
    }

    public async Task<DockerContainersPruneResponse?> PruneContainersAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync("/containers/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker containers prune API hata döndü: {StatusCode}", response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerContainersPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker konteynerleri temizlenemedi.");
            return null;
        }
    }

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

    public async Task<DockerActionResult> RenameContainerAsync(string containerId, string newName, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/{Uri.EscapeDataString(containerId)}/rename?name={Uri.EscapeDataString(newName)}";
            using var response = await _transport.HttpClient.PostAsync(url, null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container yeniden adlandırıldı.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Container yeniden adlandırılamadı.");
            _logger.LogWarning("Docker rename hatası ({StatusCode}): {ContainerId} -> {NewName} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(newName),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container yeniden adlandırılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerContainerCreateResponse?> CreateContainerAsync(string? name, DockerContainerCreateRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = string.IsNullOrWhiteSpace(name)
                ? "/containers/create"
                : $"/containers/create?name={Uri.EscapeDataString(name)}";

            string jsonBody = JsonSerializer.Serialize(request, CorvusJsonSerializerContext.Default.DockerContainerCreateRequest);
            using var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

            using var response = await _transport.HttpClient.PostAsync(url, content, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner oluşturulamadı.");
                _logger.LogWarning("Docker create container hatası ({StatusCode}): {Name} - {Error}",
                    response.StatusCode,
                    Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(name ?? ""),
                    Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerContainerCreateResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container oluşturulamadı: {Name}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(name ?? ""));
            return null;
        }
    }
}
