using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

public class DockerVolumeClient
{
    private readonly IDockerHttpTransport _transport;
    private readonly ILogger<DockerHttpClient> _logger;

    public DockerVolumeClient(IDockerHttpTransport transport, ILogger<DockerHttpClient> logger)
    {
        _transport = transport;
        _logger = logger;
    }

    public async Task<DockerVolumesPruneResponse?> PruneVolumesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync("/volumes/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker volumes prune API hata döndü: {StatusCode}", response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerVolumesPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker hacimleri temizlenemedi.");
            return null;
        }
    }

    public async Task<DockerNetworksPruneResponse?> PruneNetworksAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync("/networks/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker networks prune API hata döndü: {StatusCode}", response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerNetworksPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker ağları temizlenemedi.");
            return null;
        }
    }

    public async Task<DockerBuildCachePruneResponse?> PruneBuildCacheAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync("/build/prune", null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker build cache prune API hata döndü: {StatusCode}", response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerBuildCachePruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker build cache temizlenemedi.");
            return null;
        }
    }

    public async Task<DockerActionResult> DeleteVolumeAsync(string volumeName, bool force = false, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/volumes/{Uri.EscapeDataString(volumeName)}?force={(force ? "true" : "false")}";
            using var response = await _transport.HttpClient.DeleteAsync(url, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Hacim silindi.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Hacim silinemedi.");
            _logger.LogWarning("Docker hacim silme hatası ({StatusCode}): {Volume} - {Error}", response.StatusCode, volumeName, error);
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker hacim silinemedi: {Volume}", volumeName);
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }
}
