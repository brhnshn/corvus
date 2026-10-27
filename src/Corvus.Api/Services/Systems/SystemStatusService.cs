using Corvus.Api.Data;
using Corvus.Api.Models.Systems;

namespace Corvus.Api.Services.Systems;

public interface ISystemStatusService
{
    Task<SystemStatusDto> GetStatusAsync();
}

public class SystemStatusService : ISystemStatusService
{
    private readonly ISystemRepository _systemRepo;
    private readonly ITelemetryRingBuffer _ringBuffer;
    private readonly IConfiguration _configuration;
    private readonly ISettingsRepository _settingsRepo;

    public SystemStatusService(
        ISystemRepository systemRepo,
        ITelemetryRingBuffer ringBuffer,
        IConfiguration configuration,
        ISettingsRepository settingsRepo)
    {
        _systemRepo = systemRepo;
        _ringBuffer = ringBuffer;
        _configuration = configuration;
        _settingsRepo = settingsRepo;
    }

    public async Task<SystemStatusDto> GetStatusAsync()
    {
        var systems = await _systemRepo.GetAllAsync();
        int total = systems.Count;
        int online = systems.Count(s => s.Status == "online");
        int degraded = systems.Count(s => s.Status == "degraded");
        int offline = systems.Count(s => s.Status == "offline");

        string provider = Environment.GetEnvironmentVariable("CORVUS_DATABASE_PROVIDER")
                          ?? _configuration["Database:Provider"]
                          ?? "Sqlite";

        bool isPostgres = provider.Equals("PostgreSql", StringComparison.OrdinalIgnoreCase);
        string engine = isPostgres ? "postgresql" : "sqlite";
        bool isWalMode = !isPostgres;
        int retentionDays = await ResolveRetentionDaysAsync(); // 0 = suresiz (RetentionCleanupService ile ayni semantik)

        long memoryBytes = _ringBuffer.EstimateMemoryBytes();

        return new SystemStatusDto(
            Engine: engine,
            IsWalMode: isWalMode,
            RetentionDays: retentionDays,
            TotalSystems: total,
            OnlineSystems: online,
            DegradedSystems: degraded,
            OfflineSystems: offline,
            BufferMemoryBytes: memoryBytes,
            ServerTimeUtc: DateTime.UtcNow.ToString("o")
        );
    }

    /// <summary>RetentionCleanupService ile aynı öncelik: ayarlar deposu, ortam değişkeni, varsayılan 30 gün.</summary>
    private async Task<int> ResolveRetentionDaysAsync()
    {
        string? rawDays = await _settingsRepo.GetAsync("retention_days");
        if (!string.IsNullOrWhiteSpace(rawDays) && int.TryParse(rawDays, out int parsed))
        {
            return parsed;
        }

        string? envRetention = Environment.GetEnvironmentVariable("CORVUS_METRICS_RETENTION_DAYS");
        if (int.TryParse(envRetention, out int envVal)) return envVal;

        return 30;
    }
}
