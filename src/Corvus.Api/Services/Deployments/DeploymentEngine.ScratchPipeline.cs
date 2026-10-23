using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;
using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Services.Deployments;

// Sıfırdan (scratch) dağıtım boru hattı: imaj çekme, oluşturma, başlatma, sağlık kontrolü ve port/env ayrıştırma
public partial class DeploymentEngine
{
    private async Task ExecuteScratchPipelineAsync(DeploymentRecord record, ScratchDeploymentRequest request)
    {
        var stopwatch = Stopwatch.StartNew();
        var logBuffer = new StringBuilder();
        string containerName = record.TargetName;
        string imageName = record.ImageName;

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

        AppendLog($"\u001b[36m[Corvus Engine] Sıfırdan Dağıtım Başlatıldı: {containerName} (ID: {record.Id})\u001b[0m\n");
        AppendLog($"Hedef İmaj: {imageName} | Yeniden Başlatma: {request.RestartPolicy ?? "unless-stopped"}\n\n");

        string? createdContainerId = null;

        try
        {
            // Adım 1: Pre-pull (Fail-Fast Kapısı)
            await ChangeStepAsync("pulling");
            AppendLog($"\u001b[33m--- Adım 1/3: İmaj çekiliyor ({imageName}) ---\u001b[0m\n");

            bool pullSuccess = await _dockerClient.PullImageProgressAsync(imageName, chunk =>
            {
                AppendLog(chunk);
                return Task.CompletedTask;
            });

            if (!pullSuccess)
            {
                throw new InvalidOperationException($"'{imageName}' imajı Docker Hub veya Registry'den çekilemedi. Lütfen imaj adını ve tag'ini kontrol edin.");
            }

            AppendLog($"\u001b[32m✔ İmaj başarıyla çekildi.\u001b[0m\n\n");

            // İmaj ID çözümü
            var imgInspect = await _dockerClient.InspectImageAsync(imageName);
            if (imgInspect != null)
            {
                record.NewDigest = imgInspect.Id;
                AppendLog($"İmaj ID: {imgInspect.Id}\n");
            }

            // Adım 2: Konteyner Oluşturma (Creating)
            await ChangeStepAsync("recreating");
            AppendLog($"\u001b[33m--- Adım 2/3: Konteyner yapılandırılıyor ve oluşturuluyor ---\u001b[0m\n");

            var envList = ParseEnvironmentVariables(request.Env);
            var (portBindings, exposedPorts) = ParsePortBindings(request.Ports);

            var createReq = new DockerContainerCreateRequest
            {
                Image = imageName,
                Env = envList.Count > 0 ? envList : null,
                HostConfig = new DockerHostConfig
                {
                    RestartPolicy = new DockerRestartPolicy
                    {
                        Name = string.IsNullOrWhiteSpace(request.RestartPolicy) ? "unless-stopped" : request.RestartPolicy
                    },
                    PortBindings = portBindings.Count > 0 ? portBindings : null
                }
            };

            AppendLog($"'{containerName}' isimli yeni konteyner oluşturuluyor...\n");
            if (portBindings.Count > 0)
            {
                AppendLog($"Port Eşlemeleri: {string.Join(", ", portBindings.Keys)}\n");
            }
            if (envList.Count > 0)
            {
                AppendLog($"Ortam Değişkenleri: {envList.Count} adet tanımlandı.\n");
            }

            var createRes = await _dockerClient.CreateContainerAsync(containerName, createReq);
            if (createRes == null || string.IsNullOrWhiteSpace(createRes.Id))
            {
                throw new InvalidOperationException("Konteyner oluşturulamadı (Docker API cevabı boş döndü).");
            }

            createdContainerId = createRes.Id;
            AppendLog($"\u001b[32m✔ Konteyner başarıyla oluşturuldu (ID: {createdContainerId[..Math.Min(12, createdContainerId.Length)]}).\u001b[0m\n\n");

            // Adım 3: Başlatma & Canlılık Doğrulama (Starting & Healthcheck)
            await ChangeStepAsync("healthcheck");
            AppendLog($"\u001b[33m--- Adım 3/3: Konteyner başlatılıyor ve doğrulanıyor ---\u001b[0m\n");

            var startRes = await _dockerClient.StartContainerAsync(createdContainerId);
            if (!startRes.Success)
            {
                throw new InvalidOperationException($"Konteyner başlatılamadı: {startRes.Message}");
            }

            AppendLog("Konteyner başlatıldı. Erken kararlılık kontrol ediliyor (1.5s)...\n");
            await Task.Delay(1500);

            var inspectAfter = await _dockerClient.InspectContainerAsync(createdContainerId);
            if (inspectAfter?.State?.Running != true)
            {
                string exitCode = inspectAfter?.State?.ExitCode.ToString() ?? "unknown";
                string err = inspectAfter?.State?.Error ?? "Bilinmeyen hata";
                throw new InvalidOperationException($"Konteyner başlatıldıktan hemen sonra durdu (ExitCode: {exitCode}, Error: {err}).");
            }

            AppendLog("\u001b[32m✔ Konteyner sağlıklı şekilde çalışıyor!\u001b[0m\n\n");

            // Başarılı Tamamlama
            stopwatch.Stop();
            long durationMs = stopwatch.ElapsedMilliseconds;
            record.Status = "success";
            record.CurrentStep = "completed";
            record.DurationMs = durationMs;
            record.CompletedAt = DateTime.UtcNow.ToString("o");

            AppendLog($"\u001b[32m=== [Corvus Engine] Sıfırdan Dağıtım Başarıyla Tamamlandı ({durationMs} ms) ===\u001b[0m\n");
            record.LogOutput = logBuffer.ToString();

            await _deploymentRepo.CompleteAsync(record.Id, "success", record.NewDigest, durationMs, null, record.LogOutput);

            var compPayload = JsonSerializer.Serialize(new DeploymentCompletedEventPayload(
                "completed",
                record.Id,
                "success",
                durationMs,
                record.NewDigest,
                null,
                DateTime.UtcNow.ToString("o")
            ), CorvusJsonSerializerContext.Default.DeploymentCompletedEventPayload);

            DispatchStreamMessage(record.Id, new DeploymentStreamMessage("completed", compPayload));
            DispatchGlobalEvent("deployment_completed", compPayload);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            long durationMs = stopwatch.ElapsedMilliseconds;
            _logger.LogError(ex, "Sıfırdan dağıtım başarısız oldu: {DeploymentId}", record.Id);

            // Başarısızlık durumunda oluşturulan geçici konteyneri otomatik temizle (Artık/Öksüz konteyner bırakmama garantisi)
            if (!string.IsNullOrWhiteSpace(createdContainerId))
            {
                try
                {
                    AppendLog($"\u001b[33mBaşarısız olan geçici konteyner temizleniyor ({createdContainerId[..Math.Min(12, createdContainerId.Length)]})...\u001b[0m\n");
                    await _dockerClient.DeleteContainerAsync(createdContainerId, force: true, removeVolumes: false);
                    AppendLog("\u001b[32m✔ Geçici konteyner temizlendi.\u001b[0m\n");
                }
                catch (Exception cleanupEx)
                {
                    _logger.LogWarning(cleanupEx, "Başarısız sıfırdan dağıtım sonrası konteyner temizlenemedi: {ContainerId}", createdContainerId);
                }
            }

            record.Status = "failed";
            record.CurrentStep = "failed";
            record.DurationMs = durationMs;
            record.ErrorMessage = ex.Message;
            record.CompletedAt = DateTime.UtcNow.ToString("o");

            AppendLog($"\n\u001b[31m[HATA] Dağıtım başarısız: {ex.Message}\u001b[0m\n");
            record.LogOutput = logBuffer.ToString();

            await _deploymentRepo.CompleteAsync(record.Id, "failed", null, durationMs, ex.Message, record.LogOutput);

            var failPayload = JsonSerializer.Serialize(new DeploymentCompletedEventPayload(
                "completed",
                record.Id,
                "failed",
                durationMs,
                null,
                ex.Message,
                DateTime.UtcNow.ToString("o")
            ), CorvusJsonSerializerContext.Default.DeploymentCompletedEventPayload);

            DispatchStreamMessage(record.Id, new DeploymentStreamMessage("completed", failPayload));
            DispatchGlobalEvent("deployment_failed", failPayload);
        }
        finally
        {
            if (_streamSubscribers.TryRemove(record.Id, out var subs))
            {
                foreach (var channel in subs.Values)
                {
                    channel.Writer.TryComplete();
                }
            }

            _ = Task.Run(async () =>
            {
                await Task.Delay(5000);
                _completionSources.TryRemove(record.Id, out _);
            });
        }
    }

    private static (Dictionary<string, List<DockerPortBindingHost>?> PortBindings, Dictionary<string, object> ExposedPorts) ParsePortBindings(string? portsRaw)
    {
        var bindings = new Dictionary<string, List<DockerPortBindingHost>?>();
        var exposed = new Dictionary<string, object>();

        if (string.IsNullOrWhiteSpace(portsRaw))
            return (bindings, exposed);

        var entries = portsRaw.Split(new[] { ',', '\n', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var entry in entries)
        {
            // Format: "8080:80" veya "8080:80/tcp" veya "53:53/udp"
            var parts = entry.Split(':');
            if (parts.Length == 2)
            {
                string hostPort = parts[0].Trim();
                string containerPortPart = parts[1].Trim();
                string containerPortKey = containerPortPart.Contains('/') ? containerPortPart : $"{containerPortPart}/tcp";

                bindings[containerPortKey] = new List<DockerPortBindingHost>
                {
                    new() { HostPort = hostPort, HostIp = "0.0.0.0" }
                };
                exposed[containerPortKey] = new object();
            }
        }

        return (bindings, exposed);
    }

    private static List<string> ParseEnvironmentVariables(string? envRaw)
    {
        var list = new List<string>();
        if (string.IsNullOrWhiteSpace(envRaw))
            return list;

        var lines = envRaw.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var line in lines)
        {
            if (line.StartsWith('#') || !line.Contains('='))
                continue;

            list.Add(line);
        }

        return list;
    }
}
