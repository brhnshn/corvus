using Corvus.Api.Models.Systems;

namespace Corvus.Api.Data;

public interface ISystemRepository
{
    Task<List<SystemEntity>> GetAllAsync();
    Task<SystemEntity?> GetByIdAsync(string id);
    Task<int> CreateAsync(SystemEntity system);
    Task<int> UpdateAsync(SystemEntity system);
    Task<int> UpdateStatusAsync(string id, string status, string lastSeenAt);
    Task<int> DeleteAsync(string id);
    Task<int> UpsertTokenAsync(SystemTokenEntity token);
    Task<SystemTokenEntity?> GetTokenByHashAsync(string tokenHash);
    Task<int> RevokeTokenAsync(string systemId);
    Task<int> UpsertContainersCacheAsync(string systemId, List<SystemContainerCacheEntity> containers);
    Task<List<SystemContainerCacheEntity>> GetCachedContainersAsync(string systemId);
}
