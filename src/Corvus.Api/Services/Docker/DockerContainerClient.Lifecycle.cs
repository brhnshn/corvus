using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

// Konteyner yaşam döngüsü eylemleri: yeniden başlat, başlat, durdur, duraklat, sil ve temizle
public partial class DockerContainerClient
{
    public async Task<DockerActionResult> RestartContainerAsync(string containerId, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await _transport.HttpClient.PostAsync($"/containers/{Uri.EscapeDataString(containerId)}/restart", null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Konteyner yeniden başlatıldı.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner yeniden başlatılamadı.");
            _logger.LogWarning("Docker restart hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner yeniden başlatılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
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
                return new DockerActionResult(true, "Konteyner başlatıldı.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                return new DockerActionResult(true, "Konteyner zaten çalışıyor.", 200);
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner başlatılamadı.");
            _logger.LogWarning("Docker start hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner başlatılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
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
                return new DockerActionResult(true, "Konteyner durduruldu.");
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotModified)
            {
                return new DockerActionResult(true, "Konteyner zaten durmuş.", 200);
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner durdurulamadı.");
            _logger.LogWarning("Docker stop hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner durdurulamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
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
                return new DockerActionResult(true, "Konteyner duraklatıldı.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner duraklatılamadı.");
            _logger.LogWarning("Docker pause hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner duraklatılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
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
                return new DockerActionResult(true, "Konteyner devam ettirildi.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner devam ettirilemedi.");
            _logger.LogWarning("Docker unpause hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner devam ettirilemedi: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
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
                return new DockerActionResult(true, "Konteyner silindi.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner silinemedi.");
            _logger.LogWarning("Docker container silme hatası ({StatusCode}): {ContainerId} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner silinemedi: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
            return new DockerActionResult(false, $"Docker bağlantı hatası: {ex.Message}", 500);
        }
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
}
