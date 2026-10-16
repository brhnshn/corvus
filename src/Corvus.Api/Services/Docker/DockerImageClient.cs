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
        return await PullImageProgressAsync(imageName, null, cancellationToken);
    }

    public async Task<bool> PullImageProgressAsync(string imageName, Func<string, Task>? onLogChunk = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"/images/create?fromImage={Uri.EscapeDataString(imageName)}");
            using var response = await _transport.HttpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Docker imaj çekme (pull) HTTP başarısız: {StatusCode} for {Image}", response.StatusCode, imageName);
                return false;
            }

            using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var reader = new StreamReader(stream);

            string? line;
            while (!cancellationToken.IsCancellationRequested && (line = await reader.ReadLineAsync(cancellationToken)) != null)
            {
                if (string.IsNullOrWhiteSpace(line)) continue;

                string formattedLine = line;
                try
                {
                    using var doc = JsonDocument.Parse(line);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("error", out var errProp))
                    {
                        var errMsg = errProp.GetString();
                        if (onLogChunk != null) await onLogChunk($"\u001b[31mError: {errMsg}\u001b[0m\n");
                        _logger.LogError("Docker pull hatası döndü: {Error}", errMsg);
                        return false;
                    }

                    string status = root.TryGetProperty("status", out var sProp) ? sProp.GetString() ?? "" : "";
                    string id = root.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                    string progress = root.TryGetProperty("progress", out var pProp) ? pProp.GetString() ?? "" : "";

                    if (!string.IsNullOrEmpty(id))
                    {
                        formattedLine = $"{id}: {status} {progress}".TrimEnd();
                    }
                    else
                    {
                        formattedLine = status;
                    }
                }
                catch
                {
                    // JSON ayrıştırılamazsa raw satırı ilet
                }

                if (onLogChunk != null && !string.IsNullOrWhiteSpace(formattedLine))
                {
                    await onLogChunk(formattedLine + "\n");
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker imaj çekme (pull) başarısız: {Image}", imageName);
            if (onLogChunk != null)
            {
                try { await onLogChunk($"\u001b[31mPull error: {ex.Message}\u001b[0m\n"); } catch { }
            }
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
            _logger.LogWarning("Docker imaj silme hatası ({StatusCode}): {ImageId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(imageId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Docker imaj silinemedi: {ImageId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(imageId));
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
