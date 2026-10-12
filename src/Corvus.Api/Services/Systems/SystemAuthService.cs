using System.Security.Cryptography;
using System.Text;
using Corvus.Api.Data;
using Corvus.Api.Models.Systems;

namespace Corvus.Api.Services.Systems;

public interface ISystemAuthService
{
    string GenerateNodeKey();
    string ComputeSha256Hash(string rawKey);
    bool VerifyToken(string providedRawKey, string expectedHashHex);
    Task<(bool IsValid, SystemEntity? System)> AuthenticateBearerTokenAsync(string authHeader);
    Task<string> CreateSystemTokenAsync(string systemId);
    Task RevokeTokenAsync(string systemId);
}

public class SystemAuthService : ISystemAuthService
{
    private const string KeyPrefix = "crv_node_live_";
    private readonly ISystemRepository _systemRepo;

    public SystemAuthService(ISystemRepository systemRepo)
    {
        _systemRepo = systemRepo;
    }

    public string GenerateNodeKey()
    {
        // 32-byte cryptographically secure random entropy
        byte[] entropy = RandomNumberGenerator.GetBytes(32);
        string hex = Convert.ToHexString(entropy).ToLowerInvariant();
        return $"{KeyPrefix}{hex}";
    }

    public string ComputeSha256Hash(string rawKey)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(rawKey.Trim());
        byte[] hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public bool VerifyToken(string providedRawKey, string expectedHashHex)
    {
        string providedHashHex = ComputeSha256Hash(providedRawKey);
        byte[] provBytes = Encoding.UTF8.GetBytes(providedHashHex);
        byte[] expBytes = Encoding.UTF8.GetBytes(expectedHashHex);

        if (provBytes.Length != expBytes.Length) return false;

        // Constant-time comparison against timing attacks
        return CryptographicOperations.FixedTimeEquals(provBytes, expBytes);
    }

    public async Task<(bool IsValid, SystemEntity? System)> AuthenticateBearerTokenAsync(string authHeader)
    {
        if (string.IsNullOrWhiteSpace(authHeader)) return (false, null);

        string rawToken = authHeader.Trim();
        if (rawToken.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            rawToken = rawToken[7..].Trim();
        }

        if (string.IsNullOrWhiteSpace(rawToken)) return (false, null);

        string hash = ComputeSha256Hash(rawToken);
        var tokenEntity = await _systemRepo.GetTokenByHashAsync(hash);

        if (tokenEntity == null || tokenEntity.IsRevoked == 1)
        {
            return (false, null);
        }

        // Verify with constant time check
        if (!VerifyToken(rawToken, tokenEntity.TokenHash))
        {
            return (false, null);
        }

        var system = await _systemRepo.GetByIdAsync(tokenEntity.SystemId);
        if (system == null) return (false, null);

        return (true, system);
    }

    public async Task<string> CreateSystemTokenAsync(string systemId)
    {
        string rawKey = GenerateNodeKey();
        string hash = ComputeSha256Hash(rawKey);
        string prefix = rawKey[..Math.Min(16, rawKey.Length)];

        var token = new SystemTokenEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            SystemId = systemId,
            TokenHash = hash,
            TokenPrefix = prefix,
            CreatedAt = DateTime.UtcNow.ToString("o"),
            IsRevoked = 0
        };

        await _systemRepo.UpsertTokenAsync(token);
        return rawKey;
    }

    public async Task RevokeTokenAsync(string systemId)
    {
        await _systemRepo.RevokeTokenAsync(systemId);
    }
}
