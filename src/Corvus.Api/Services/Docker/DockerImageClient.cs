using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

public class DockerImageClient
{
    private readonly IDockerHttpTransport _transport;
    private readonly ILogger<DockerHttpClient> _logger;

    public DockerImageClient(IDockerHttpTransport transport, ILogger<DockerHttpClient> logger)
    {
        _transport = transport;
        _logger = logger;
    }

    public async Task<DockerImageInspectInfo?> InspectImageAsync(string imageIdOrName, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.GetAsync($"/images/{Uri.EscapeDataString(imageIdOrName)}/json", cancellationToken);
            if (!response.IsSuccessStatusCode) return null;

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerImageInspectInfo, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Docker imaj inspect alınamadı: {Image}", imageIdOrName);
            return null;
        }
    }

    public async Task<bool> PullImageAsync(string imageName, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync($"/images/create?fromImage={Uri.EscapeDataString(imageName)}", null, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker imaj çekme (pull) başarısız: {Image}", imageName);
            return false;
        }
    }

    public async Task<DockerImagesPruneResponse?> PruneImagesAsync(bool all = false, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/images/prune?filters={Uri.EscapeDataString(all ? "{\"dangling\":[\"false\"]}" : "{\"dangling\":[\"true\"]}")}";
            using var response = await _transport.HttpClient.PostAsync(url, null, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Docker images prune API hata döndü: {StatusCode}", response.StatusCode);
                return null;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonSerializer.DeserializeAsync(stream, CorvusJsonSerializerContext.Default.DockerImagesPruneResponse, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker imajları temizlenemedi.");
            return null;
        }
    }

    public async Task<DockerActionResult> DeleteImageAsync(string imageId, bool force = false, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/images/{Uri.EscapeDataString(imageId)}?force={(force ? "true" : "false")}";
            using var response = await _transport.HttpClient.DeleteAsync(url, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "İmaj silindi.");
            }

            string error = await ExtractErrorMessageAsync(response, "İmaj silinemedi.");
            _logger.LogWarning("Docker imaj silme hatası ({StatusCode}): {ImageId} - {Error}", response.StatusCode, imageId, error);
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker imaj silinemedi: {ImageId}", imageId);
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
    }

    public static async Task<string> ExtractErrorMessageAsync(HttpResponseMessage response, string defaultMessage)
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
        catch { }

        return defaultMessage;
    }
}
