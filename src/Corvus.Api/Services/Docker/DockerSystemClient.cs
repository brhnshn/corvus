using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

public class DockerSystemClient
{
    private readonly IDockerHttpTransport _transport;
    private readonly ILogger<DockerHttpClient> _logger;

    public DockerSystemClient(IDockerHttpTransport transport, ILogger<DockerHttpClient> logger)
    {
        _transport = transport;
        _logger = logger;
    }

    public async Task<bool> PingAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.GetAsync("/_ping", cancellationToken);
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
            using var response = await _transport.HttpClient.GetAsync("/version", cancellationToken);
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

    public async Task<DockerSystemDfResponse?> GetSystemDiskUsageAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.GetAsync("/system/df", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker system df API hata döndü: {StatusCode}", response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerSystemDfResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker sistem disk kullanımı (system df) sorgulanamadı.");
            return null;
        }
    }
}
