using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Services.Deployments;

public partial class DeploymentEngine : IDeploymentEngine
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

        // Corvus Öz-Koruma Kuralı (Self-Preservation Guard - 502 Bad Gateway Önleme)
        if (IsSelfContainer(inspect, containerId, originalName))
        {
            throw new InvalidOperationException(
                "Corvus kendi konteynerini panel içerisinden canlı olarak durdurup yeniden oluşturamaz. " +
                "Bu işlem çalışan API sunucusunu durduracağı için '502 Bad Gateway' kesintisine yol açar. " +
                "Corvus sürümünü güncellemek için lütfen harici CI/CD Webhook veya docker compose komutunu kullanınız.");
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

    private static bool IsSelfContainer(DockerContainerInspectInfo inspect, string containerId, string originalName)
    {
        string hostName = Environment.MachineName;
        if (!string.IsNullOrWhiteSpace(hostName))
        {
            if (containerId.StartsWith(hostName, StringComparison.OrdinalIgnoreCase) ||
                hostName.StartsWith(containerId, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        if (inspect.Config?.Env != null)
        {
            foreach (var env in inspect.Config.Env)
            {
                if (env.StartsWith("CORVUS_PORT=", StringComparison.OrdinalIgnoreCase) ||
                    env.StartsWith("CORVUS_DATA_DIR=", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        string img = inspect.Config?.Image ?? inspect.Image ?? string.Empty;
        if (originalName.Contains("corvus", StringComparison.OrdinalIgnoreCase) ||
            img.Contains("corvus", StringComparison.OrdinalIgnoreCase) ||
            containerId.Contains("corvus", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
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
