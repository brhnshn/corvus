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

    public SystemStatusService(
        ISystemRepository systemRepo,
        ITelemetryRingBuffer ringBuffer,
        IConfiguration configuration)
    {
        _systemRepo = systemRepo;
        _ringBuffer = ringBuffer;
        _configuration = configuration;
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
        int retentionDays = isPostgres ? 0 : 7; // SQLite 7 gun, PostgreSQL suresiz

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
}
