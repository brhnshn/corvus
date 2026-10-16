using Corvus.Api.Models.Deployments;

namespace Corvus.Api.Data;

public interface IDeploymentRepository
{
    Task CreateAsync(DeploymentRecord record);
    Task UpdateStepAsync(string id, string step);
    Task CompleteAsync(string id, string status, string? newDigest, long durationMs, string? error, string? logOutput);
    Task<DeploymentRecord?> GetByIdAsync(string id);
    Task<List<DeploymentRecord>> GetRecentDeploymentsAsync(string? targetId = null, int limit = 50);
}
