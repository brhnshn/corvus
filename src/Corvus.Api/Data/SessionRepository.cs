using Dapper;

namespace Corvus.Api.Data;

public interface ISessionRepository
{
    Task CreateSessionAsync(string token, string username, DateTime expiresAt);
    Task<(bool Exists, string? Username, DateTime ExpiresAt)> GetSessionAsync(string token);
    Task DeleteSessionAsync(string token);
    Task CleanupExpiredSessionsAsync();
}

public class SessionRepository : ISessionRepository
{
    private readonly IDbConnectionFactory _db;

    public SessionRepository(IDbConnectionFactory db)
    {
        _db = db;
    }

    public record SessionDbRow(string token, string username, string expires_at, string created_at);

    public async Task CreateSessionAsync(string token, string username, DateTime expiresAt)
    {
        using var conn = _db.CreateConnection();
        const string sql = @"
            INSERT INTO user_sessions (token, username, expires_at, created_at)
            VALUES (@Token, @Username, @ExpiresAt, @CreatedAt)
            ON CONFLICT(token) DO UPDATE SET expires_at = @ExpiresAt;";

        await conn.ExecuteAsync(sql, new
        {
            Token = token,
            Username = username,
            ExpiresAt = expiresAt.ToString("o"),
            CreatedAt = DateTime.UtcNow.ToString("o")
        });
    }

    public async Task<(bool Exists, string? Username, DateTime ExpiresAt)> GetSessionAsync(string token)
    {
        using var conn = _db.CreateConnection();
        const string sql = "SELECT token, username, expires_at, created_at FROM user_sessions WHERE token = @Token LIMIT 1;";
        var row = await conn.QueryFirstOrDefaultAsync<SessionDbRow>(sql, new { Token = token });
        if (row == null)
        {
            return (false, null, DateTime.MinValue);
        }

        if (DateTime.TryParse(row.expires_at, out var parsedExpires))
        {
            return (true, row.username, parsedExpires);
        }

        return (true, row.username, DateTime.MinValue);
    }

    public async Task DeleteSessionAsync(string token)
    {
        using var conn = _db.CreateConnection();
        const string sql = "DELETE FROM user_sessions WHERE token = @Token;";
        await conn.ExecuteAsync(sql, new { Token = token });
    }

    public async Task CleanupExpiredSessionsAsync()
    {
        using var conn = _db.CreateConnection();
        const string sql = "DELETE FROM user_sessions WHERE expires_at < @Cutoff;";
        await conn.ExecuteAsync(sql, new { Cutoff = DateTime.UtcNow.ToString("o") });
    }
}
