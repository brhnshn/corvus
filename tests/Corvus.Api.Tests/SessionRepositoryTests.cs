using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class SessionRepositoryTests
{
    private class TempDbScope : IDisposable
    {
        public string TempDir { get; }
        public IDbConnectionFactory DbFactory { get; }

        public TempDbScope()
        {
            TempDir = Path.Combine(Path.GetTempPath(), "corvus_session_test_" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(TempDir);

            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Database:DataDir"] = TempDir
                })
                .Build();

            DbFactory = new DbConnectionFactory(config);
            DatabaseMigrator.Migrate(DbFactory, NullLogger.Instance);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(TempDir))
                {
                    Directory.Delete(TempDir, true);
                }
            }
            catch { }
        }
    }

    [Fact]
    public async Task SessionRepository_CreateAndGet_WorksCorrectly()
    {
        using var scope = new TempDbScope();
        var repo = new SessionRepository(scope.DbFactory);

        string token = "test_token_1234567890abcdef";
        string username = "admin";
        var expiresAt = DateTime.UtcNow.AddDays(7);

        await repo.CreateSessionAsync(token, username, expiresAt);

        var (exists, retrievedUser, retrievedExpires) = await repo.GetSessionAsync(token);

        Assert.True(exists);
        Assert.Equal(username, retrievedUser);
        Assert.True(retrievedExpires > DateTime.UtcNow.AddDays(6));
    }

    [Fact]
    public async Task SessionRepository_Delete_RemovesSession()
    {
        using var scope = new TempDbScope();
        var repo = new SessionRepository(scope.DbFactory);

        string token = "test_delete_token";
        await repo.CreateSessionAsync(token, "admin", DateTime.UtcNow.AddDays(1));

        var (beforeExists, _, _) = await repo.GetSessionAsync(token);
        Assert.True(beforeExists);

        await repo.DeleteSessionAsync(token);

        var (afterExists, user, _) = await repo.GetSessionAsync(token);
        Assert.False(afterExists);
        Assert.Null(user);
    }

    [Fact]
    public async Task SessionRepository_CleanupExpiredSessions_RemovesOnlyExpired()
    {
        using var scope = new TempDbScope();
        var repo = new SessionRepository(scope.DbFactory);

        string expiredToken = "expired_token";
        string validToken = "valid_token";

        await repo.CreateSessionAsync(expiredToken, "user1", DateTime.UtcNow.AddHours(-1));
        await repo.CreateSessionAsync(validToken, "user2", DateTime.UtcNow.AddHours(24));

        await repo.CleanupExpiredSessionsAsync();

        var (expExists, _, _) = await repo.GetSessionAsync(expiredToken);
        var (valExists, valUser, _) = await repo.GetSessionAsync(validToken);

        Assert.False(expExists);
        Assert.True(valExists);
        Assert.Equal("user2", valUser);
    }

    [Fact]
    public async Task AuthService_WithSessionRepository_PersistsAndHydratesSession_AcrossContainerRestarts()
    {
        using var scope = new TempDbScope();
        var sessionRepo = new SessionRepository(scope.DbFactory);
        var userRepo = new UserRepository(scope.DbFactory);
        var settingsRepo = new SettingsRepository(scope.DbFactory);

        var config = new ConfigurationBuilder().Build();

        // 1. Birinci container örneğinde oturum oluştur
        var authInstance1 = new AuthService(userRepo, settingsRepo, config, sessionRepo);
        string token = authInstance1.GenerateSessionToken("testadmin");

        // DB'ye yazılmasını garantilemek için GetSession kontrolü yap
        // (GenerateSessionToken arka planda veya senkron yazıyor)
        for (int i = 0; i < 10; i++)
        {
            var (exists, _, _) = await sessionRepo.GetSessionAsync(token);
            if (exists) break;
            await Task.Delay(50);
        }

        var (dbExists, dbUser, _) = await sessionRepo.GetSessionAsync(token);
        Assert.True(dbExists);
        Assert.Equal("testadmin", dbUser);

        // 2. Simülasyon: Container yeniden başladı! (RAM tamamen sıfır, yeni AuthService örneği)
        var authInstance2 = new AuthService(userRepo, settingsRepo, config, sessionRepo);

        // Yeni instance RAM'inde henüz token yok, SQLite fallback ile validate edilmeli
        var (isValid, validatedUser) = authInstance2.ValidateSessionToken(token);

        Assert.True(isValid);
        Assert.Equal("testadmin", validatedUser);

        // 3. Çıkış yapıldığında oturum silinmeli
        authInstance2.InvalidateSessionToken(token);

        for (int i = 0; i < 10; i++)
        {
            var (exists, _, _) = await sessionRepo.GetSessionAsync(token);
            if (!exists) break;
            await Task.Delay(50);
        }

        var (afterLogoutValid, _) = authInstance2.ValidateSessionToken(token);
        Assert.False(afterLogoutValid);
    }
}
