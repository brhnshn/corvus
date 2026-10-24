using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Docker;

// Canlı kaynak/yeniden başlatma ilkesi güncelleme, yeniden adlandırma ve konteyner oluşturma
public partial class DockerContainerClient
{
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
            return new DockerActionResult(false, "Konteyner ID boş olamaz.", 400);
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

    public async Task<DockerActionResult> RenameContainerAsync(string containerId, string newName, CancellationToken cancellationToken = default)
    {
        try
        {
            string url = $"/containers/{Uri.EscapeDataString(containerId)}/rename?name={Uri.EscapeDataString(newName)}";
            using var response = await _transport.HttpClient.PostAsync(url, null, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new DockerActionResult(true, "Konteyner yeniden adlandırıldı.");
            }

            string error = await DockerImageClient.ExtractErrorMessageAsync(response, "Konteyner yeniden adlandırılamadı.");
            _logger.LogWarning("Docker rename hatası ({StatusCode}): {ContainerId} -> {NewName} - {Error}",
                response.StatusCode,
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(newName),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(error));
            return new DockerActionResult(false, error, (int)response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Konteyner yeniden adlandırılamadı: {ContainerId}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
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
            _logger.LogError(ex, "Konteyner oluşturulamadı: {Name}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(name ?? ""));
            return null;
        }
    }
}
