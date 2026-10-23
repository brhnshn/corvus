using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;
using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Services.Deployments;

public partial class DeploymentEngine
{
    public async Task<DeploymentRecord> StartScratchDeploymentAsync(
        ScratchDeploymentRequest request,
        string triggeredBy = "user",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Image))
        {
            throw new ArgumentException("İmaj adı zorunludur.", nameof(request.Image));
        }

        if (string.IsNullOrWhiteSpace(request.ContainerName))
        {
            throw new ArgumentException("Konteyner adı zorunludur.", nameof(request.ContainerName));
        }

        string containerName = request.ContainerName.Trim().TrimStart('/');
        string imageName = request.Image.Trim();

        // 0. Corvus Öz-Koruma Kuralı (Self-Preservation Guard)
        if (containerName.Contains("corvus", StringComparison.OrdinalIgnoreCase) ||
            imageName.Contains("corvus", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Corvus adı veya imajı içeren konteynerler panel üzerinden dağıtılamaz (Corvus Self-Preservation Guard).");
        }

        // 1. Kilit kontrolü (containerName bazında)
        if (!_lockManager.TryAcquireLock($"scratch_{containerName}", out var lockReleaser))
        {
            throw new InvalidOperationException($"Bu konteyner ismi ({containerName}) için şu anda aktif bir dağıtım yürütülüyor.");
        }

        // 2. Mevcut konteyner çakışma kontrolü
        var existing = await _dockerClient.InspectContainerAsync(containerName, cancellationToken);
        if (existing != null)
        {
            // Eğer önceki başarısız bir denemeden kalmış 'created' veya 'dead' konteyner ise otomatik temizle
            string existingStatus = existing.State?.Status?.ToLowerInvariant() ?? "";
            if (existing.State?.Running != true && (existingStatus == "created" || existingStatus == "dead"))
            {
                await _dockerClient.DeleteContainerAsync(existing.Id, force: true, removeVolumes: false, cancellationToken);
            }
            else
            {
                lockReleaser.Dispose();
                throw new InvalidOperationException($"'{containerName}' adında bir konteyner zaten mevcut. Lütfen farklı bir isim seçin veya mevcut konteyneri güncelleyin.");
            }
        }

        string deploymentId = $"dep_scratch_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
        var tcs = new TaskCompletionSource<DeploymentRecord>(TaskCreationOptions.RunContinuationsAsynchronously);
        _completionSources[deploymentId] = tcs;

        var record = new DeploymentRecord
        {
            Id = deploymentId,
            TargetType = "container",
            TargetId = containerName,
            TargetName = containerName,
            TriggerType = "manual_scratch",
            TriggeredBy = triggeredBy,
            Status = "pending",
            CurrentStep = "queued",
            ImageName = imageName,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _deploymentRepo.CreateAsync(record);

        var startedPayload = new DeploymentStartedGlobalPayload(
            deploymentId,
            containerName,
            containerName,
            "manual_scratch",
            triggeredBy,
            imageName
        );
        DispatchGlobalEvent("deployment_started", JsonSerializer.Serialize(startedPayload, CorvusJsonSerializerContext.Default.DeploymentStartedGlobalPayload));

        // Arka planda güvenli yürütme başlat
        _ = Task.Run(async () =>
        {
            using (lockReleaser)
            {
                try
                {
                    await ExecuteScratchPipelineAsync(record, request);
                    tcs.TrySetResult(record);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Sıfırdan dağıtım yürütülürken beklenmeyen hata oluştu: {DeploymentId}", deploymentId);
                    tcs.TrySetException(ex);
                }
            }
        }, CancellationToken.None);

        return record;
    }
}
