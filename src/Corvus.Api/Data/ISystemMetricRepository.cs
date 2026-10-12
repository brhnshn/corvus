using Corvus.Api.Models.Systems;

namespace Corvus.Api.Data;

public interface ISystemMetricRepository
{
    Task<int> Insert1mBatchAsync(IReadOnlyList<SystemMetric1mEntity> metrics);
    Task<List<SystemMetric1mEntity>> Get1mHistoryAsync(string systemId, string sinceUtc, int limit = 1440);
    Task<int> AggregateAndPruneRollingMetricsAsync(int retention1mDays = 7, int retention1hDays = 30);
    Task<List<SystemMetric1hEntity>> Get1hHistoryAsync(string systemId, string sinceUtc, int limit = 720);
}
