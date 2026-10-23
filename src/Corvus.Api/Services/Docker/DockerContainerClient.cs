using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

public partial class DockerContainerClient
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
}
