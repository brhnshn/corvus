using System.Collections.Concurrent;
using System.IO.Pipes;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IDockerHttpClient
{
    Task<bool> PingAsync(CancellationToken cancellationToken = default);
    Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default);
    Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default);
    Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default);
    Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default);
    Task<DockerContainerInspectInfo?> InspectContainerAsync(string containerId, CancellationToken cancellationToken = default);
    Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default);
    Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default);
    Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default);
    Task<DockerContainersPruneResponse?> PruneContainersAsync(CancellationToken cancellationToken = default);
    Task<DockerImagesPruneResponse?> PruneImagesAsync(bool all = false, CancellationToken cancellationToken = default);
    Task<DockerVolumesPruneResponse?> PruneVolumesAsync(CancellationToken cancellationToken = default);
    Task<DockerNetworksPruneResponse?> PruneNetworksAsync(CancellationToken cancellationToken = default);
    Task<DockerBuildCachePruneResponse?> PruneBuildCacheAsync(CancellationToken cancellationToken = default);
}

public class DockerHttpClient : IDockerHttpClient, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DockerHttpClient> _logger;
    private readonly string? _dockerSocketEnv;
    private readonly ConcurrentDictionary<string, (long CpuTotal, long SystemCpu, DateTime Timestamp)> _cpuHistory = new(StringComparer.OrdinalIgnoreCase);

    public DockerHttpClient(ILogger<DockerHttpClient> logger, IConfiguration configuration)
    {
        _logger = logger;
        _dockerSocketEnv = Environment.GetEnvironmentVariable("DOCKER_SOCKET")
                           ?? configuration["Docker:SocketPath"];

        var handler = new SocketsHttpHandler
        {
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1),
            ConnectCallback = async (context, cancellationToken) => await CreateRawDockerStreamAsync(cancellationToken)
        };

        _httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost"),
            Timeout = TimeSpan.FromSeconds(15)
        };
    }

    private async Task<Stream> CreateRawDockerStreamAsync(CancellationToken cancellationToken)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            string[] candidatePipes = ["dockerDesktopLinuxEngine", "docker_engine"];
            foreach (var pipeName in candidatePipes)
            {
                try
                {
                    var pipe = new NamedPipeClientStream(
                        serverName: ".",
                        pipeName: pipeName,
                        direction: PipeDirection.InOut,
                        options: PipeOptions.Asynchronous);

                    using var connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, connectCts.Token);
                    await pipe.ConnectAsync(linkedCts.Token);
                    return pipe;
                }
                catch
                {
                    // sonraki pipe adayını dene
                }
            }

            throw new InvalidOperationException("Hiçbir Windows Docker named pipe'ına bağlanılamadı.");
        }
        else
        {
            string socketPath = !string.IsNullOrWhiteSpace(_dockerSocketEnv) 
                ? _dockerSocketEnv 
                : "/var/run/docker.sock";

            var endpoint = new UnixDomainSocketEndPoint(socketPath);
            var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);

            try
            {
                await socket.ConnectAsync(endpoint, cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        }
    }

    public async Task<bool> PingAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.GetAsync("/_ping", cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Docker daemon ping başarısız.");
            return false;
        }
    }

    public async Task<DockerVersionInfo?> GetVersionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.GetAsync("/version", cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerVersionInfo, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Docker version bilgisi alınamadı.");
            return null;
        }
    }

    public async Task<List<DockerContainerInfo>> ListContainersAsync(bool all = true, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/json?all={(all ? "true" : "false")}";
            using var response = await _httpClient.GetAsync(url, cancellationToken);
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
            using var response = await _httpClient.GetAsync($"/containers/{Uri.EscapeDataString(containerId)}/json", cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerContainerInspectInfo, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Container inspect alınamadı: {ContainerId}", containerId);
            return null;
        }
    }

    private static async Task<string> ExtractDockerErrorMessageAsync(HttpResponseMessage response, string defaultMessage)
    {
        try
        {
            var content = await response.Content.ReadAsStringAsync();
            if (!string.IsNullOrWhiteSpace(content))
            {
                using var doc = JsonDocument.Parse(content);
                if (doc.RootElement.TryGetProperty("message", out var msgProp) && !string.IsNullOrWhiteSpace(msgProp.GetString()))
                {
                    return msgProp.GetString()!;
                }
            }
        }
        catch
        {
            // json parse edilemezse default dön
        }

        return defaultMessage;
    }

    public async Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/restart", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container yeniden başlatıldı.");
            }

            string error = await ExtractDockerErrorMessageAsync(response, "Container yeniden başlatılamadı.");
            _logger.LogWarning("Docker restart hatası ({StatusCode}): {ContainerId} - {Error}", response.StatusCode, containerId, error);
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container yeniden başlatılamadı: {ContainerId}", containerId);
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> StartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/start", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container başlatıldı.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                return new DockerActionResult(true, "Container zaten çalışıyor.", 200);
            }

            string error = await ExtractDockerErrorMessageAsync(response, "Container başlatılamadı.");
            _logger.LogWarning("Docker start hatası ({StatusCode}): {ContainerId} - {Error}", response.StatusCode, containerId, error);
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container başlatılamadı: {ContainerId}", containerId);
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> StopContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/stop", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container durduruldu.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                return new DockerActionResult(true, "Container zaten durdurulmuş.", 200);
            }

            string error = await ExtractDockerErrorMessageAsync(response, "Container durdurulamadı.");
            _logger.LogWarning("Docker stop hatası ({StatusCode}): {ContainerId} - {Error}", response.StatusCode, containerId, error);
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container durdurulamadı: {ContainerId}", containerId);
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> PauseContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/pause", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container duraklatıldı.");
            }

            string error = await ExtractDockerErrorMessageAsync(response, "Container duraklatılamadı.");
            _logger.LogWarning("Docker pause hatası ({StatusCode}): {ContainerId} - {Error}", response.StatusCode, containerId, error);
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container duraklatılamadı: {ContainerId}", containerId);
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<DockerActionResult> UnpauseContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/unpause", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Container devam ettirildi.");
            }

            string error = await ExtractDockerErrorMessageAsync(response, "Container devam ettirilemedi.");
            _logger.LogWarning("Docker unpause hatası ({StatusCode}): {ContainerId} - {Error}", response.StatusCode, containerId, error);
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Container devam ettirilemedi: {ContainerId}", containerId);
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public async Task<ContainerStatsDto?> GetContainerStatsAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/{Uri.EscapeDataString(containerId)}/stats?stream=false&one-shot=true";
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            var root = doc.RootElement;

            // CPU Stats
            long cpuTotal = 0;
            long systemCpu = 0;
            int onlineCpus = 1;

            if (root.TryGetProperty("cpu_stats", out var cpuStats))
            {
                if (cpuStats.TryGetProperty("cpu_usage", out var cpuUsage))
                {
                    if (cpuUsage.TryGetProperty("total_usage", out var tu)) cpuTotal = tu.GetInt64();
                    if (cpuUsage.TryGetProperty("percpu_usage", out var percpu) && percpu.ValueKind == JsonValueKind.Array)
                    {
                        onlineCpus = Math.Max(1, percpu.GetArrayLength());
                    }
                }
                if (cpuStats.TryGetProperty("system_cpu_usage", out var scu)) systemCpu = scu.GetInt64();
                if (cpuStats.TryGetProperty("online_cpus", out var oc) && oc.GetInt32() > 0)
                {
                    onlineCpus = oc.GetInt32();
                }
            }

            // Pre-CPU Stats (Eğer Docker daemon precpu_stats sağlamışsa)
            long preCpuTotal = 0;
            long preSystemCpu = 0;
            if (root.TryGetProperty("precpu_stats", out var precpuStats))
            {
                if (precpuStats.TryGetProperty("cpu_usage", out var preCpuUsage) && preCpuUsage.TryGetProperty("total_usage", out var ptu))
                {
                    preCpuTotal = ptu.GetInt64();
                }
                if (precpuStats.TryGetProperty("system_cpu_usage", out var pscu))
                {
                    preSystemCpu = pscu.GetInt64();
                }
            }

            double cpuPercent = 0.0;
            // 1. Docker'ın kendisi precpu_stats sağladıysa doğrudan hesapla
            if (preSystemCpu > 0 && systemCpu > preSystemCpu && cpuTotal >= preCpuTotal)
            {
                long cpuDelta = cpuTotal - preCpuTotal;
                long systemDelta = systemCpu - preSystemCpu;
                cpuPercent = Math.Round(((double)cpuDelta / systemDelta) * onlineCpus * 100.0, 2);
                _cpuHistory[containerId] = (cpuTotal, systemCpu, DateTime.UtcNow);
            }
            // 2. one-shot modunda önceki sliding delta hafızamızdan anında (0ms) hesapla
            else if (_cpuHistory.TryGetValue(containerId, out var prev) && prev.SystemCpu > 0 && systemCpu > prev.SystemCpu && cpuTotal >= prev.CpuTotal)
            {
                long cpuDelta = cpuTotal - prev.CpuTotal;
                long systemDelta = systemCpu - prev.SystemCpu;
                cpuPercent = Math.Round(((double)cpuDelta / systemDelta) * onlineCpus * 100.0, 2);
                _cpuHistory[containerId] = (cpuTotal, systemCpu, DateTime.UtcNow);
            }
            else
            {
                // 3. İlk kez karşılaşılan konteyner (Cold start):
                // İlk örneği kaydet ve 100ms'lik mikro-aralıkla 2. örneği alarak CPU yüzdesini hemen hesapla (1000ms yerine 100ms)
                _cpuHistory[containerId] = (cpuTotal, systemCpu, DateTime.UtcNow);
                try
                {
                    await Task.Delay(100, cancellationToken);
                    using var secondResponse = await _httpClient.GetAsync(url, cancellationToken);
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
                catch
                {
                    // İkinci mikro-örnek alınamazsa CPU %0 kalsın ama RAM/Net başarıyla dönsün
                }
            }

            // Memory Stats
            long memUsage = 0;
            long memLimit = 0;
            if (root.TryGetProperty("memory_stats", out var memStats))
            {
                if (memStats.TryGetProperty("usage", out var mu)) memUsage = mu.GetInt64();
                if (memStats.TryGetProperty("limit", out var ml)) memLimit = ml.GetInt64();
            }

            double memPercent = memLimit > 0 ? Math.Round(((double)memUsage / memLimit) * 100.0, 2) : 0.0;

            // Network Stats
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

            // Bellek şişmesini önleme: Eğer _cpuHistory boyutu çok büyürse bayat kayıtları temizle
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
            _logger.LogWarning(ex, "Container stats bilgisi alınamadı: {ContainerId}", containerId);
            return null;
        }
    }

    public async Task<List<string>> GetContainerLogsAsync(string containerId, int tail = 100, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/{Uri.EscapeDataString(containerId)}/logs?stdout=true&stderr=true&timestamps=true&tail={tail}";
            using var response = await _httpClient.GetAsync(url, cancellationToken);
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
            _logger.LogError(ex, "Container logları alınamadı: {ContainerId}", containerId);
            return new List<string>();
        }
    }

    public async Task<string?> CreateExecInstanceAsync(string containerId, string shell = "/bin/sh", CancellationToken cancellationToken = default)
    {
        try
        {
            string jsonBody = $$"""
            {
              "AttachStdin": true,
              "AttachStdout": true,
              "AttachStderr": true,
              "Tty": true,
              "Cmd": [{{JsonSerializer.Serialize(shell, CorvusJsonSerializerContext.Default.String)}}]
            }
            """;

            using var content = new StringContent(jsonBody, Encoding.UTF8, new MediaTypeHeaderValue("application/json"));
            using var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/exec", content, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                string err = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Docker exec instance oluşturulamadı: {StatusCode} - {Error}", response.StatusCode, err);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var res = await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerExecCreateResponse, cancellationToken);
            return res?.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker exec instance oluşturulurken hata: {ContainerId}", containerId);
            return null;
        }
    }

    public async Task<Stream> StartExecStreamAsync(string execId, CancellationToken cancellationToken = default)
    {
        var rawStream = await CreateRawDockerStreamAsync(cancellationToken);

        string request = $"POST /exec/{Uri.EscapeDataString(execId)}/start HTTP/1.1\r\n" +
                         "Host: localhost\r\n" +
                         "User-Agent: Corvus\r\n" +
                         "Content-Type: application/json\r\n" +
                         "Connection: Upgrade\r\n" +
                         "Upgrade: tcp\r\n" +
                         "Content-Length: 28\r\n\r\n" +
                         "{\"Detach\":false,\"Tty\":true}";

        byte[] requestBytes = Encoding.UTF8.GetBytes(request);
        await rawStream.WriteAsync(requestBytes, cancellationToken);
        await rawStream.FlushAsync(cancellationToken);

        // Docker'dan dönen HTTP yanıt başlığını oku (\r\n\r\n görene kadar)
        int matched = 0;
        byte[] matchSequence = "\r\n\r\n"u8.ToArray();
        byte[] singleByte = new byte[1];

        while (matched < matchSequence.Length)
        {
            int read = await rawStream.ReadAsync(singleByte, 0, 1, cancellationToken);
            if (read == 0)
            {
                rawStream.Dispose();
                throw new InvalidOperationException("Docker daemon exec bağlantısını erken kapattı.");
            }

            if (singleByte[0] == matchSequence[matched])
            {
                matched++;
            }
            else
            {
                matched = singleByte[0] == matchSequence[0] ? 1 : 0;
            }
        }

        return rawStream;
    }

    public async Task<bool> ResizeExecAsync(string execId, int width, int height, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync($"/exec/{Uri.EscapeDataString(execId)}/resize?h={height}&w={width}", null, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Docker exec resize isteği başarısız oldu: {ExecId}", execId);
            return false;
        }
    }

    public async Task<DockerContainersPruneResponse?> PruneContainersAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync("/containers/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker containers/prune başarısız: {StatusCode}", response.StatusCode);
                return null;
            }
            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerContainersPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker containers prune sırasında hata");
            return null;
        }
    }

    public async Task<DockerImagesPruneResponse?> PruneImagesAsync(bool all = false, CancellationToken cancellationToken = default)
    {
        try
        {
            string filters = all ? "{\"dangling\":[\"false\"]}" : "{\"dangling\":[\"true\"]}";
            using var response = await _httpClient.PostAsync($"/images/prune?filters={Uri.EscapeDataString(filters)}", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker images/prune başarısız: {StatusCode}", response.StatusCode);
                return null;
            }
            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerImagesPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker images prune sırasında hata");
            return null;
        }
    }

    public async Task<DockerVolumesPruneResponse?> PruneVolumesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync("/volumes/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker volumes/prune başarısız: {StatusCode}", response.StatusCode);
                return null;
            }
            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerVolumesPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker volumes prune sırasında hata");
            return null;
        }
    }

    public async Task<DockerNetworksPruneResponse?> PruneNetworksAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync("/networks/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker networks/prune başarısız: {StatusCode}", response.StatusCode);
                return null;
            }
            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerNetworksPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker networks prune sırasında hata");
            return null;
        }
    }

    public async Task<DockerBuildCachePruneResponse?> PruneBuildCacheAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _httpClient.PostAsync("/build/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                // Bazı eski Docker daemon'ları build/prune desteklemeyebilir (404/501), bu durumda sessizce geç
                _logger.LogDebug("Docker build/prune desteklenmiyor veya başarısız: {StatusCode}", response.StatusCode);
                return null;
            }
            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerBuildCachePruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Docker build cache prune sırasında hata");
            return null;
        }
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}
