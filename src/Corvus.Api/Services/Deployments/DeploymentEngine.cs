using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Services.Deployments;

public interface IDeploymentEngine
{
    Task<DeploymentRecord> StartDeploymentAsync(
        string containerId,
        string triggerType,
        string triggeredBy,
        bool pullLatest = true,
        CancellationToken cancellationToken = default);

    Task WaitForCompletionAsync(string deploymentId, TimeSpan timeout, CancellationToken cancellationToken = default);

    IAsyncEnumerable<DeploymentStreamMessage> SubscribeStreamAsync(string deploymentId, CancellationToken cancellationToken = default);
}

public record DeploymentStreamMessage(string EventType, string DataJson);

public class DeploymentEngine : IDeploymentEngine
{
    private readonly IDockerHttpClient _dockerClient;
    private readonly IDeploymentRepository _deploymentRepo;
    private readonly IDeploymentLockManager _lockManager;
    private readonly IEventBroadcaster _eventBroadcaster;
    private readonly ILogger<DeploymentEngine> _logger;

    // Aktif akış kanalları (deploymentId -> list of client channels)
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<DeploymentStreamMessage>>> _streamSubscribers = new();
    
    // deploymentId -> TaskCompletionSource (wait=true veya senkron bekleyen istekler için)
    private readonly ConcurrentDictionary<string, TaskCompletionSource<DeploymentRecord>> _completionSources = new();

    public DeploymentEngine(
        IDockerHttpClient dockerClient,
        IDeploymentRepository deploymentRepo,
        IDeploymentLockManager lockManager,
        IEventBroadcaster eventBroadcaster,
        ILogger<DeploymentEngine> logger)
    {
        _dockerClient = dockerClient;
        _deploymentRepo = deploymentRepo;
        _lockManager = lockManager;
        _eventBroadcaster = eventBroadcaster;
        _logger = logger;
    }

    public async Task<DeploymentRecord> StartDeploymentAsync(
        string containerId,
        string triggerType,
        string triggeredBy,
        bool pullLatest = true,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(containerId))
        {
            throw new ArgumentException("Konteyner ID boş olamaz.", nameof(containerId));
        }

        // 1. Konteyneri incele ve doğrula
        var inspect = await _dockerClient.InspectContainerAsync(containerId, cancellationToken);
        if (inspect == null)
        {
            throw new KeyNotFoundException($"Konteyner bulunamadı: {containerId}");
        }

        string originalName = (inspect.Name ?? "").TrimStart('/');
        string imageName = inspect.Config?.Image ?? inspect.Image ?? string.Empty;
        if (string.IsNullOrWhiteSpace(imageName))
        {
            throw new InvalidOperationException($"Konteyner ({containerId}) için imaj bilgisi çözülemedi.");
        }

        // 2. Kilit denemesi (Fail-Fast 409)
        if (!_lockManager.TryAcquireLock(containerId, out var lockReleaser))
        {
            throw new InvalidOperationException($"Bu konteyner ({originalName}) için şu anda aktif bir dağıtım işlemi yürütülüyor.");
        }

        string deploymentId = $"dep_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N")[..6]}";
        var tcs = new TaskCompletionSource<DeploymentRecord>(TaskCreationOptions.RunContinuationsAsynchronously);
        _completionSources[deploymentId] = tcs;

        var record = new DeploymentRecord
        {
            Id = deploymentId,
            TargetType = "container",
            TargetId = containerId,
            TargetName = originalName,
            TriggerType = triggerType,
            TriggeredBy = triggeredBy,
            Status = "pending",
            CurrentStep = "queued",
            ImageName = imageName,
            OldDigest = inspect.Image,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _deploymentRepo.CreateAsync(record);

        // Global bildirim yayını (Webhook ve UI için)
        var startedPayload = new DeploymentStartedGlobalPayload(
            deploymentId,
            containerId,
            originalName,
            triggerType,
            triggeredBy,
            imageName
        );
        DispatchGlobalEvent("deployment_started", JsonSerializer.Serialize(startedPayload, CorvusJsonSerializerContext.Default.DeploymentStartedGlobalPayload));

        // Arka planda güvenli yürütme başlat
        _ = Task.Run(async () =>
        {
            using (lockReleaser)
            {
                await ExecutePipelineAsync(record, inspect, pullLatest);
            }
        });

        return record;
    }

    public async Task WaitForCompletionAsync(string deploymentId, TimeSpan timeout, CancellationToken cancellationToken = default)
    {
        if (_completionSources.TryGetValue(deploymentId, out var tcs))
        {
            using var timeoutCts = new CancellationTokenSource(timeout);
            using var linked = CancellationTokenSource.CreateLinkedTokenSource(timeoutCts.Token, cancellationToken);
            
            var completedTask = await Task.WhenAny(tcs.Task, Task.Delay(Timeout.Infinite, linked.Token));
            if (completedTask != tcs.Task)
            {
                throw new TimeoutException($"Dağıtım {timeout.TotalSeconds} saniye içinde tamamlanamadı.");
            }
        }
        else
        {
            // Belki zaten tamamlandı, DB'den kontrol et
            var existing = await _deploymentRepo.GetByIdAsync(deploymentId);
            if (existing != null && (existing.Status == "success" || existing.Status == "failed" || existing.Status == "rolled_back"))
            {
                return;
            }
            throw new KeyNotFoundException($"Aktif dağıtım bulunamadı: {deploymentId}");
        }
    }

    public async IAsyncEnumerable<DeploymentStreamMessage> SubscribeStreamAsync(
        string deploymentId,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var subs = _streamSubscribers.GetOrAdd(deploymentId, _ => new ConcurrentDictionary<Guid, Channel<DeploymentStreamMessage>>());
        var subId = Guid.NewGuid();
        var channel = Channel.CreateBounded<DeploymentStreamMessage>(new BoundedChannelOptions(500)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleWriter = false,
            SingleReader = true
        });

        subs[subId] = channel;

        // Mevcut durumu selamlama olarak gönder
        var current = await _deploymentRepo.GetByIdAsync(deploymentId);
        if (current != null)
        {
            var initialPayload = JsonSerializer.Serialize(new DeploymentStepChangedEventPayload(
                "step_changed",
                deploymentId,
                current.CurrentStep,
                DateTime.UtcNow.ToString("o")
            ), CorvusJsonSerializerContext.Default.DeploymentStepChangedEventPayload);

            channel.Writer.TryWrite(new DeploymentStreamMessage("step_changed", initialPayload));

            if (!string.IsNullOrEmpty(current.LogOutput))
            {
                var logPayload = JsonSerializer.Serialize(new DeploymentLogChunkEventPayload(
                    "log",
                    deploymentId,
                    current.LogOutput,
                    DateTime.UtcNow.ToString("o")
                ), CorvusJsonSerializerContext.Default.DeploymentLogChunkEventPayload);

                channel.Writer.TryWrite(new DeploymentStreamMessage("log", logPayload));
            }

            if (current.Status == "success" || current.Status == "failed" || current.Status == "rolled_back")
            {
                var compPayload = JsonSerializer.Serialize(new DeploymentCompletedEventPayload(
                    "completed",
                    deploymentId,
                    current.Status,
                    current.DurationMs,
                    current.NewDigest,
                    current.ErrorMessage,
                    DateTime.UtcNow.ToString("o")
                ), CorvusJsonSerializerContext.Default.DeploymentCompletedEventPayload);

                channel.Writer.TryWrite(new DeploymentStreamMessage("completed", compPayload));
                channel.Writer.Complete();
            }
        }

        try
        {
            while (await channel.Reader.WaitToReadAsync(cancellationToken))
            {
                while (channel.Reader.TryRead(out var msg))
                {
                    yield return msg;
                }
            }
        }
        finally
        {
            subs.TryRemove(subId, out _);
        }
    }

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

    private void DispatchStreamMessage(string deploymentId, DeploymentStreamMessage message)
    {
        if (_streamSubscribers.TryGetValue(deploymentId, out var subs))
        {
            foreach (var channel in subs.Values)
            {
                channel.Writer.TryWrite(message);
            }
        }
    }

    private void DispatchGlobalEvent(string eventType, string payloadJson)
    {
        try
        {
            _eventBroadcaster.Broadcast(eventType, payloadJson);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Global event yayını sırasında hata: {EventType}", eventType);
        }
    }
}
