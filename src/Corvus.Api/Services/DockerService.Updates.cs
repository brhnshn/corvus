using System.Collections.Concurrent;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public partial class DockerService
{
    public async Task<DockerActionResult> UpdateContainerAsync(string containerId, DockerContainerUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var result = await _client.UpdateContainerAsync(containerId, request, cancellationToken);
        if (result.Success)
        {
            InvalidateContainersCache();
        }
        return result;
    }

    public async Task<DockerActionResult> UpdateContainerConfigAsync(string containerId, ContainerResourceUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var result = await _client.UpdateContainerConfigAsync(containerId, request, cancellationToken);
        if (result.Success)
        {
            _statsCache.TryRemove(containerId, out _);
            InvalidateContainersCache();
        }
        return result;
    }

    public static List<string> ExtractTagsFromLabels(Dictionary<string, string>? labels)
    {
        var tags = new List<string>();
        if (labels == null) return tags;

        if (labels.TryGetValue("corvus.tags", out var lTags) && !string.IsNullOrWhiteSpace(lTags))
        {
            tags.AddRange(lTags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }
        if (labels.TryGetValue("environment", out var envTag) && !string.IsNullOrWhiteSpace(envTag))
        {
            tags.Add(envTag.Trim());
        }
        else if (labels.TryGetValue("env", out var shortEnvTag) && !string.IsNullOrWhiteSpace(shortEnvTag))
        {
            tags.Add(shortEnvTag.Trim());
        }
        if (labels.TryGetValue("com.docker.compose.project", out var cProj) && !string.IsNullOrWhiteSpace(cProj))
        {
            tags.Add(cProj.Trim());
        }
        return tags.Where(t => !string.IsNullOrWhiteSpace(t))
                   .Distinct(StringComparer.OrdinalIgnoreCase)
                   .ToList();
    }

    public async Task<ContainerImageUpdateInfo> CheckContainerUpdateAsync(string containerId, CancellationToken cancellationToken = default)
    {
        var inspect = await InspectContainerAsync(containerId, cancellationToken);
        if (inspect == null)
        {
            return new ContainerImageUpdateInfo
            {
                ContainerId = containerId,
                Error = "Konteyner bulunamadı veya inspect verisi alınamadı."
            };
        }

        string imageName = inspect.Config?.Image ?? inspect.Image ?? string.Empty;
        if (string.IsNullOrWhiteSpace(imageName))
        {
            return new ContainerImageUpdateInfo
            {
                ContainerId = containerId,
                Error = "Konteyner imaj adı okunamadı."
            };
        }

        List<string>? repoDigests = null;
        if (!string.IsNullOrEmpty(inspect.Image))
        {
            var imageInspect = await _client.InspectImageAsync(inspect.Image, cancellationToken);
            repoDigests = imageInspect?.RepoDigests;
        }

        if (_ociRegistryClient == null)
        {
            return new ContainerImageUpdateInfo
            {
                ContainerId = containerId,
                Image = imageName,
                Error = "OCI registry servisi yapılandırılmamış."
            };
        }

        return await _ociRegistryClient.CheckContainerUpdateAsync(containerId, imageName, inspect.Image, repoDigests, cancellationToken);
    }

    public async Task<List<ContainerImageUpdateInfo>> CheckAllContainersUpdateAsync(CancellationToken cancellationToken = default)
    {
        var containers = await GetContainersAsync(cancellationToken);
        var results = new List<ContainerImageUpdateInfo>();

        foreach (var c in containers)
        {
            if (ShouldIgnoreContainer(c)) continue;
            var updateInfo = await CheckContainerUpdateAsync(c.Id, cancellationToken);
            results.Add(updateInfo);
        }

        return results;
    }

    public async Task<DockerActionResult> RecreateContainerAsync(string containerId, bool pullLatest = true, CancellationToken cancellationToken = default)
    {
        var inspect = await InspectContainerAsync(containerId, cancellationToken);
        if (inspect == null)
        {
            return new DockerActionResult(false, "Konteyner bulunamadı.", 404);
        }

        string imageName = inspect.Config?.Image ?? inspect.Image ?? string.Empty;
        if (string.IsNullOrWhiteSpace(imageName))
        {
            return new DockerActionResult(false, "Konteynerin imaj bilgisi çözülemedi.", 400);
        }

        string originalName = (inspect.Name ?? "").TrimStart('/');
        bool wasRunning = inspect.State?.Running == true;

        // 1. Yeni imajı çek (Fail-Fast Kapısı: İmaj çekilemezse çalışan konteynere ASLA dokunulmayacak)
        if (pullLatest)
        {
            _logger.LogInformation("Konteyner yeniden oluşturma öncesi güncel imaj çekiliyor: {Image}", 
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(imageName));
            bool pulled = await _client.PullImageAsync(imageName, cancellationToken);
            if (!pulled)
            {
                _logger.LogError("Pre-pull fail-fast: Güncel imaj çekilemediği için çalışan konteynere dokunulmadı: {Image}", 
                    Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(imageName));
                return new DockerActionResult(false, $"Pre-pull fail-fast: '{imageName}' imajı çekilemedi. Konteyner kesintisiz çalışmaya devam ediyor.", 502);
            }
        }

        // 2. Çalışıyorsa eski konteyneri durdur
        if (wasRunning)
        {
            var stopRes = await _client.StopContainerAsync(containerId, cancellationToken);
            if (!stopRes.Success)
            {
                return new DockerActionResult(false, $"Mevcut konteyner durdurulamadı: {stopRes.Message}", 500);
            }
        }

        // 3. Eski konteyneri geçici bir isme yeniden adlandır (Nano-benzersiz rollback emniyeti)
        string backupName = $"{originalName}_corvus_backup_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
        var renameRes = await _client.RenameContainerAsync(containerId, backupName, cancellationToken);
        if (!renameRes.Success)
        {
            if (wasRunning) await _client.StartContainerAsync(containerId, cancellationToken);
            return new DockerActionResult(false, $"Konteyner yeniden adlandırılamadı: {renameRes.Message}", 500);
        }

        // 4. Yeni konteyneri aynı yapılandırmayla oluştur
        var createReq = new DockerContainerCreateRequest
        {
            Image = imageName,
            Cmd = inspect.Config?.Cmd,
            Entrypoint = inspect.Config?.Entrypoint,
            WorkingDir = inspect.Config?.WorkingDir,
            User = inspect.Config?.User,
            Env = inspect.Config?.Env,
            Labels = inspect.Config?.Labels,
            HostConfig = inspect.HostConfig,
            NetworkingConfig = inspect.NetworkSettings?.Networks != null
                ? new DockerNetworkingConfigRequest { EndpointsConfig = inspect.NetworkSettings.Networks }
                : null
        };

        var createRes = await _client.CreateContainerAsync(originalName, createReq, cancellationToken);
        if (createRes == null || string.IsNullOrWhiteSpace(createRes.Id))
        {
            _logger.LogError("Yeni konteyner oluşturulamadı, eski konteyner geri alınıyor: {Name}", 
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(originalName));
            // Rollback: eski ismi geri ver, çalışıyorsa yeniden başlat
            await _client.RenameContainerAsync(containerId, originalName, cancellationToken);
            if (wasRunning) await _client.StartContainerAsync(containerId, cancellationToken);
            return new DockerActionResult(false, "Yeni konteyner oluşturulamadı. Eski konteyner geri yüklendi.", 500);
        }

        string newContainerId = createRes.Id;

        // 5. Yeni konteyneri başlat
        var startRes = await _client.StartContainerAsync(newContainerId, cancellationToken);
        if (!startRes.Success)
        {
            _logger.LogError("Yeni konteyner başlatılamadı, geri alma yapılıyor: {NewId}", 
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(newContainerId));
            // Rollback: oluşturulan yeni konteyneri sil, eski konteynerin adını düzeltip başlat
            await _client.DeleteContainerAsync(newContainerId, force: true, removeVolumes: false, cancellationToken);
            await _client.RenameContainerAsync(containerId, originalName, cancellationToken);
            if (wasRunning) await _client.StartContainerAsync(containerId, cancellationToken);
            return new DockerActionResult(false, $"Yeni konteyner başlatılamadı ({startRes.Message}). Eski konteyner geri yüklendi.", 500);
        }

        // 6. Başarılı oldu! Eski geçici konteyneri temizle (volumeleri silmeden koru)
        try
        {
            await _client.DeleteContainerAsync(containerId, force: true, removeVolumes: false, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Eski yedek konteyner silinirken uyarı: {OldId}", 
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(containerId));
        }

        InvalidateContainersCache();
        return new DockerActionResult(true, $"Konteyner '{originalName}' güncel imajla başarıyla yeniden oluşturuldu ve başlatıldı.");
    }
}
