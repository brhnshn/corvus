using Corvus.Api.Data;
using Corvus.Api.Models.Systems;
using Corvus.Api.Services.Systems;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class MultiNodePhase2Tests : IDisposable
{
    private readonly string _tempDbDir;
    private readonly IDbConnectionFactory _dbFactory;

    public MultiNodePhase2Tests()
    {
        _tempDbDir = Path.Combine(Path.GetTempPath(), "corvus_phase2_test_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempDbDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Database:DataDir"] = _tempDbDir
            })
            .Build();

        _dbFactory = new DbConnectionFactory(config);
        DatabaseMigrator.Migrate(_dbFactory, NullLogger.Instance);
    }

    [Fact]
    public async Task SystemAuthService_Generates_And_Validates_Cryptographic_Token()
    {
        var sysRepo = new SystemRepository(_dbFactory);
        var authService = new SystemAuthService(sysRepo);

        string systemId = "sys-auth-" + Guid.NewGuid().ToString("N")[..8];
        await sysRepo.CreateAsync(new SystemEntity
        {
            Id = systemId,
            Name = "Auth Test Node",
            CreatedAt = DateTime.UtcNow.ToString("o"),
            UpdatedAt = DateTime.UtcNow.ToString("o")
        });

        // 1. Create token
        string rawKey = await authService.CreateSystemTokenAsync(systemId);
        Assert.StartsWith("crv_node_live_", rawKey);

        // 2. Compute hash
        string hash = authService.ComputeSha256Hash(rawKey);
        Assert.Equal(64, hash.Length);

        // 3. Constant-time verify
        bool matches = authService.VerifyToken(rawKey, hash);
        Assert.True(matches);

        bool wrongMatches = authService.VerifyToken("crv_node_live_invalidkey", hash);
        Assert.False(wrongMatches);

        // 4. AuthenticateBearerTokenAsync with Bearer header
        var (isValid, authedSystem) = await authService.AuthenticateBearerTokenAsync($"Bearer {rawKey}");
        Assert.True(isValid);
        Assert.NotNull(authedSystem);
        Assert.Equal(systemId, authedSystem.Id);

        // 5. Revoke token
        await authService.RevokeTokenAsync(systemId);

        var (afterRevokeValid, _) = await authService.AuthenticateBearerTokenAsync($"Bearer {rawKey}");
        Assert.False(afterRevokeValid);
    }

    [Fact]
    public async Task SystemTunnelManager_Tracks_Connections_And_Handles_Rpc_Response()
    {
        var logger = NullLogger<SystemTunnelManager>.Instance;
        var manager = new SystemTunnelManager(logger);
        string systemId = "sys-tunnel-01";

        // Without socket, IsConnected should be false
        Assert.False(manager.IsConnected(systemId));

        // When sending request to offline system, returns graceful offline response
        var rpcReq = new DockerRpcRequest(Action: "restart", ContainerId: "my-container-id");
        var resp = await manager.SendDockerRequestAsync(systemId, rpcReq, TimeSpan.FromMilliseconds(100));
        Assert.False(resp.Success);
        Assert.Contains("offline", resp.Message, StringComparison.OrdinalIgnoreCase);

        // Test HandleRpcResponse with TaskCompletionSource
        string correlationId = "corr-12345";
        var rpcResponse = new DockerRpcResponse(Success: true, Message: "Container started");

        // Even if unknown correlation id, should not throw
        manager.HandleRpcResponse(correlationId, rpcResponse);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempDbDir))
            {
                Directory.Delete(_tempDbDir, true);
            }
        }
        catch { }
    }
}
