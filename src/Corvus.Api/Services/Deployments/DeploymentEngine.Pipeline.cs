using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;
using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Services.Deployments;

public partial class DeploymentEngine
{
    private async Task ExecutePipelineAsync(DeploymentRecord record, DockerContainerInspectInfo inspect, bool pullLatest)
    {
        var stopwatch = Stopwatch.StartNew();
        var logBuffer = new StringBuilder();
        string containerId = record.TargetId;
        string originalName = record.TargetName;
        string imageName = record.ImageName;
        bool wasRunning = inspect.State?.Running == true;

        void AppendLog(string chunk)
        {
            logBuffer.Append(chunk);
            var payload = JsonSerializer.Serialize(new DeploymentLogChunkEventPayload(
                "log",
                record.Id,
                chunk,
                DateTime.UtcNow.ToString("o")
            ), CorvusJsonSerializerContext.Default.DeploymentLogChunkEventPayload);

            DispatchStreamMessage(record.Id, new DeploymentStreamMessage("log", payload));
        }

        async Task ChangeStepAsync(string step)
        {
            record.CurrentStep = step;
            await _deploymentRepo.UpdateStepAsync(record.Id, step);

            var payload = JsonSerializer.Serialize(new DeploymentStepChangedEventPayload(
                "step_changed",
                record.Id,
                step,
                DateTime.UtcNow.ToString("o")
            ), CorvusJsonSerializerContext.Default.DeploymentStepChangedEventPayload);

            DispatchStreamMessage(record.Id, new DeploymentStreamMessage("step_changed", payload));
            DispatchGlobalEvent("deployment_step_changed", payload);
        }

        AppendLog($"\u001b[36m[Corvus Engine] Dağıtım başlatıldı: {originalName} (ID: {record.Id})\u001b[0m\n");
        AppendLog($"Hedef İmaj: {imageName} | Tetikleyici: {record.TriggerType} ({record.TriggeredBy})\n\n");

        string? createdNewContainerId = null;
        string? backupName = null;

        try
        {
            // Adım 1: Pre-pull (Fail-Fast Kapısı)
            if (pullLatest)
            {
                await ChangeStepAsync("pulling");
                AppendLog($"\u001b[33m--- Adım 1/4: Güncel imaj çekiliyor ({imageName}) ---\u001b[0m\n");

                bool pullSuccess = await _dockerClient.PullImageProgressAsync(imageName, chunk =>
                {
                    AppendLog(chunk);
                    return Task.CompletedTask;
                });

                if (!pullSuccess)
                {
                    throw new InvalidOperationException($"Pre-pull fail-fast: '{imageName}' imajı çekilemedi veya erişilemedi. Çalışan konteynere dokunulmadı.");
                }

                AppendLog($"\u001b[32m✔ İmaj başarıyla çekildi.\u001b[0m\n\n");
            }

            // Yeni imaj inspect
            string? newDigest = null;
            var newImgInspect = await _dockerClient.InspectImageAsync(imageName);
            if (newImgInspect != null)
            {
                newDigest = newImgInspect.Id;
                record.NewDigest = newDigest;
                AppendLog($"Yeni İmaj ID: {newDigest}\n");
            }

            // Adım 2: Konteyner Yeniden Oluşturma (Recreating)
            await ChangeStepAsync("recreating");
            AppendLog($"\u001b[33m--- Adım 2/4: Konteyner yeniden yapılandırılıyor ---\u001b[0m\n");

            if (wasRunning)
            {
                AppendLog("Mevcut konteyner durduruluyor...\n");
                var stopRes = await _dockerClient.StopContainerAsync(containerId);
                if (!stopRes.Success)
                {
                    throw new InvalidOperationException($"Mevcut konteyner durdurulamadı: {stopRes.Message}");
                }
                AppendLog("Mevcut konteyner durduruldu.\n");
            }

            // Nano-benzersiz yedek adı
            backupName = $"{originalName}_corvus_backup_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
            AppendLog($"Mevcut konteyner yedekleniyor -> {backupName}\n");
            var renameRes = await _dockerClient.RenameContainerAsync(containerId, backupName);
            if (!renameRes.Success)
            {
                if (wasRunning) await _dockerClient.StartContainerAsync(containerId);
                throw new InvalidOperationException($"Konteyner yeniden adlandırılamadı: {renameRes.Message}");
            }

            // Yeni konteyneri oluştur
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

            AppendLog($"Orijinal isim '{originalName}' ile yeni konteyner oluşturuluyor...\n");
            var createRes = await _dockerClient.CreateContainerAsync(originalName, createReq);
            if (createRes == null || string.IsNullOrWhiteSpace(createRes.Id))
            {
                throw new InvalidOperationException("Yeni konteyner oluşturulamadı (Docker create cevabı boş).");
            }

            createdNewContainerId = createRes.Id;
            AppendLog($"Yeni konteyner oluşturuldu (ID: {createdNewContainerId[..Math.Min(12, createdNewContainerId.Length)]}).\n");

            // Adım 3: Sağlık ve Başlatma (Healthcheck / Starting)
            await ChangeStepAsync("healthcheck");
            AppendLog($"\u001b[33m--- Adım 3/4: Yeni konteyner başlatılıyor ---\u001b[0m\n");

            var startRes = await _dockerClient.StartContainerAsync(createdNewContainerId);
            if (!startRes.Success)
            {
                throw new InvalidOperationException($"Yeni konteyner başlatılamadı: {startRes.Message}");
            }

            AppendLog("Konteyner başlatıldı. Başlangıç kararlılığı kontrol ediliyor...\n");
            await Task.Delay(1500); // 1.5 saniyelik erken çökme (early crash) beklemesi

            var newInspect = await _dockerClient.InspectContainerAsync(createdNewContainerId);
            if (newInspect?.State?.Running != true)
            {
                string exitCode = newInspect?.State != null ? newInspect.State.ExitCode.ToString() : "Bilinmiyor";
                throw new InvalidOperationException($"Yeni konteyner başlatıldıktan hemen sonra çöktü (Exit Code: {exitCode}).");
            }

            AppendLog("\u001b[32m✔ Yeni konteyner stabil ve çalışır durumda.\u001b[0m\n\n");

            // Başarılı: Eski yedek konteyneri temizle
            AppendLog("Yedek konteyner temizleniyor...\n");
            try
            {
                await _dockerClient.DeleteContainerAsync(containerId, force: true, removeVolumes: false);
                AppendLog("Eski yedek konteyner temizlendi.\n");
            }
            catch (Exception delEx)
            {
                AppendLog($"\u001b[33mEski yedek silinirken uyarı: {delEx.Message}\u001b[0m\n");
            }

            // Adım 4: Canlı (Live / Success)
            stopwatch.Stop();
            long durationMs = stopwatch.ElapsedMilliseconds;
            await ChangeStepAsync("live");
            AppendLog($"\u001b[32m--- Adım 4/4: Dağıtım başarıyla tamamlandı! (Süre: {durationMs} ms) ---\u001b[0m\n");

            record.Status = "success";
            record.DurationMs = durationMs;
            record.LogOutput = logBuffer.ToString();
            record.CompletedAt = DateTime.UtcNow.ToString("o");

            await _deploymentRepo.CompleteAsync(record.Id, "success", newDigest, durationMs, null, record.LogOutput);

            var compPayload = JsonSerializer.Serialize(new DeploymentCompletedEventPayload(
                "completed",
                record.Id,
                "success",
                durationMs,
                newDigest,
                null,
                DateTime.UtcNow.ToString("o")
            ), CorvusJsonSerializerContext.Default.DeploymentCompletedEventPayload);

            DispatchStreamMessage(record.Id, new DeploymentStreamMessage("completed", compPayload));
            DispatchGlobalEvent("deployment_completed", compPayload);

            if (_completionSources.TryGetValue(record.Id, out var compTcs))
            {
                compTcs.TrySetResult(record);
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long durationMs = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "Dağıtım sırasında hata meydana geldi: {DeploymentId} - {Message}", record.Id, ex.Message);

            AppendLog($"\n\u001b[31m[HATA] {ex.Message}\u001b[0m\n");

            // ROLLBACK MEKANİZMASI
            bool isRolledBack = false;
            if (!string.IsNullOrEmpty(backupName))
            {
                AppendLog("\u001b[33m--- OTOMATİK GERİ ALMA (ROLLBACK) BAŞLATILIYOR ---\u001b[0m\n");
                try
                {
                    // 1. Varsa hatalı yeni konteyneri sil
                    if (!string.IsNullOrEmpty(createdNewContainerId))
                    {
                        AppendLog($"Hatalı yeni konteyner ({createdNewContainerId[..Math.Min(12, createdNewContainerId.Length)]}) durdurulup siliniyor...\n");
                        await _dockerClient.StopContainerAsync(createdNewContainerId);
                        await _dockerClient.DeleteContainerAsync(createdNewContainerId, force: true, removeVolumes: false);
                    }

                    // 2. Yedeği orijinal adına döndür
                    AppendLog($"Yedek konteyner '{originalName}' adına geri yükleniyor...\n");
                    var rollRename = await _dockerClient.RenameContainerAsync(containerId, originalName);
                    if (!rollRename.Success)
                    {
                        AppendLog($"\u001b[31mRollback yeniden adlandırma hatası: {rollRename.Message}\u001b[0m\n");
                    }

                    // 3. Çalışıyorsa yeniden başlat
                    if (wasRunning)
                    {
                        AppendLog("Eski konteyner yeniden başlatılıyor...\n");
                        var startBackup = await _dockerClient.StartContainerAsync(containerId);
                        if (startBackup.Success)
                        {
                            AppendLog("\u001b[32m✔ Rollback başarılı: Eski konteyner çalışır durumda ayağa kaldırıldı.\u001b[0m\n");
                            isRolledBack = true;
                        }
                        else
                        {
                            AppendLog($"\u001b[31mEski konteyner başlatılamadı: {startBackup.Message}\u001b[0m\n");
                        }
                    }
                    else
                    {
                        isRolledBack = true;
                        AppendLog("\u001b[32m✔ Rollback başarılı: Eski durdurulmuş konteyner durumuna geri dönüldü.\u001b[0m\n");
                    }
                }
                catch (Exception rbEx)
                {
                    AppendLog($"\u001b[31mKritik Rollback Hatası: {rbEx.Message}\u001b[0m\n");
                }
            }

            string finalStatus = isRolledBack ? "rolled_back" : "failed";
            record.Status = finalStatus;
            record.CurrentStep = finalStatus;
            record.DurationMs = durationMs;
            record.ErrorMessage = ex.Message;
            record.LogOutput = logBuffer.ToString();
            record.CompletedAt = DateTime.UtcNow.ToString("o");

            await _deploymentRepo.CompleteAsync(record.Id, finalStatus, record.NewDigest, durationMs, ex.Message, record.LogOutput);

            var failPayload = JsonSerializer.Serialize(new DeploymentCompletedEventPayload(
                "completed",
                record.Id,
                finalStatus,
                durationMs,
                record.NewDigest,
                ex.Message,
                DateTime.UtcNow.ToString("o")
            ), CorvusJsonSerializerContext.Default.DeploymentCompletedEventPayload);

            DispatchStreamMessage(record.Id, new DeploymentStreamMessage("completed", failPayload));
            DispatchGlobalEvent("deployment_failed", failPayload);

            if (_completionSources.TryGetValue(record.Id, out var compTcs))
            {
                compTcs.TrySetResult(record);
            }
        }
        finally
        {
            // İstemci kanallarını nazikçe kapat ve sözlükten temizle
            if (_streamSubscribers.TryRemove(record.Id, out var subs))
            {
                foreach (var channel in subs.Values)
                {
                    channel.Writer.TryComplete();
                }
            }

            // Gecikmeli olarak tamamlanan TCS nesnesini bellekten temizle
            _ = Task.Run(async () =>
            {
                await Task.Delay(5000);
                _completionSources.TryRemove(record.Id, out _);
            });
        }
    }
}
