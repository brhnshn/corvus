using System.IO.Pipes;
using System.Net.Sockets;
using System.Runtime.InteropServices;
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
}

public class DockerHttpClient : IDockerHttpClient, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<DockerHttpClient> _logger;

    public DockerHttpClient(ILogger<DockerHttpClient> logger, IConfiguration configuration)
    {
        _logger = logger;

        string? dockerSocketEnv = Environment.GetEnvironmentVariable("DOCKER_SOCKET")
                                  ?? configuration["Docker:SocketPath"];

        var handler = new SocketsHttpHandler
        {
            ConnectCallback = async (context, cancellationToken) =>
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

                            using var connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(2));
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
                    string socketPath = !string.IsNullOrWhiteSpace(dockerSocketEnv) 
                        ? dockerSocketEnv 
                        : "/var/run/docker.sock";

                    var endpoint = new UnixDomainSocketEndPoint(socketPath);
                    var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);

                    await socket.ConnectAsync(endpoint, cancellationToken);
                    return new NetworkStream(socket, ownsSocket: true);
                }
            }
        };

        _httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost"),
            Timeout = TimeSpan.FromSeconds(15)
        };
    }

    public async Task<bool> PingAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync("/_ping", cancellationToken);
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
            var response = await _httpClient.GetAsync("/version", cancellationToken);
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
            var response = await _httpClient.GetAsync(url, cancellationToken);
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
            var response = await _httpClient.GetAsync($"/containers/{Uri.EscapeDataString(containerId)}/json", cancellationToken);
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
            var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/restart", null, cancellationToken);
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
            var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/start", null, cancellationToken);
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
            var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/stop", null, cancellationToken);
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
            var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/pause", null, cancellationToken);
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
            var response = await _httpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/unpause", null, cancellationToken);
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
            string url = $"/containers/{Uri.EscapeDataString(containerId)}/stats?stream=false";
            var response = await _httpClient.GetAsync(url, cancellationToken);
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

            // Pre-CPU Stats
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
            long cpuDelta = cpuTotal - preCpuTotal;
            long systemDelta = systemCpu - preSystemCpu;
            if (systemDelta > 0 && cpuDelta > 0)
            {
                cpuPercent = Math.Round(((double)cpuDelta / systemDelta) * onlineCpus * 100.0, 2);
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
            var response = await _httpClient.GetAsync(url, cancellationToken);
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

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}
