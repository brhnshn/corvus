using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IAuthService
{
    bool IsAuthEnabled { get; }
    Task<bool> HasUsersAsync();
    Task<bool> IsRegistrationEnabledAsync();
    Task SetRegistrationEnabledAsync(bool enabled);
    Task<(bool Success, string? ErrorMessage)> RegisterAsync(string username, string password);
    Task<(bool Success, string? Username)> ValidateCredentialsAsync(string username, string password);
    string GenerateSessionToken(string username);
    (bool IsValid, string? Username) ValidateSessionToken(string? token);
    void InvalidateSessionToken(string? token);
    string? CheckProxyAuthHeader(IHeaderDictionary headers, IPAddress? remoteIp = null);
    bool IsLoginRateLimited(string ipOrKey);
    void RecordLoginFailure(string ipOrKey);
    void ResetLoginAttempts(string ipOrKey);
}

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly ISettingsRepository _settings;
    private readonly ISessionRepository? _sessionRepo;
    private readonly bool _authEnabled;
    private readonly string _defaultUser;
    private readonly string _defaultPassHash;
    private readonly bool _trustProxyHeaders;

    private record SessionItem(string Username, DateTime ExpiresAt);
    private static readonly ConcurrentDictionary<string, SessionItem> ActiveSessions = new();

    private record FailedAttemptInfo(int Count, DateTime FirstAttemptAt, DateTime? LockoutUntil);
    private static readonly ConcurrentDictionary<string, FailedAttemptInfo> FailedAttempts = new();

    public bool IsAuthEnabled => _authEnabled;

    public AuthService(
        IUserRepository userRepo, 
        ISettingsRepository settings, 
        IConfiguration configuration,
        ISessionRepository? sessionRepo = null)
    {
        _userRepo = userRepo;
        _settings = settings;
        _sessionRepo = sessionRepo;

        string? envEnabled = Environment.GetEnvironmentVariable("CORVUS_AUTH_ENABLED");
        _authEnabled = envEnabled == null || !string.Equals(envEnabled, "false", StringComparison.OrdinalIgnoreCase);

        _defaultUser = Environment.GetEnvironmentVariable("CORVUS_AUTH_USER") ?? "admin";
        string rawPass = Environment.GetEnvironmentVariable("CORVUS_AUTH_PASS") ?? "corvus123";
        _defaultPassHash = HashPassword(rawPass);

        string? envTrust = Environment.GetEnvironmentVariable("CORVUS_TRUST_PROXY_HEADERS") ?? configuration["Auth:TrustProxyHeaders"];
        _trustProxyHeaders = string.Equals(envTrust, "true", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<bool> HasUsersAsync()
    {
        int count = await _userRepo.GetCountAsync();
        return count > 0;
    }

    public async Task<bool> IsRegistrationEnabledAsync()
    {
        string? val = await _settings.GetAsync("registration_enabled");
        // Varsayılan olarak açıktır ("true")
        return val == null || string.Equals(val, "true", StringComparison.OrdinalIgnoreCase);
    }

    public async Task SetRegistrationEnabledAsync(bool enabled)
    {
        await _settings.SetAsync("registration_enabled", enabled ? "true" : "false");
    }

    public async Task<(bool Success, string? ErrorMessage)> RegisterAsync(string username, string password)
    {
        bool allowed = await IsRegistrationEnabledAsync();
        if (!allowed)
        {
            return (false, "Yeni kullanıcı kayıtları kapatılmıştır.");
        }

        string cleanUser = username?.Trim() ?? string.Empty;
        if (cleanUser.Length < 3)
        {
            return (false, "Kullanıcı adı en az 3 karakter olmalıdır.");
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 4)
        {
            return (false, "Şifre en az 4 karakter olmalıdır.");
        }

        var existing = await _userRepo.GetByUsernameAsync(cleanUser);
        if (existing != null)
        {
            return (false, "Bu kullanıcı adı zaten kayıtlı.");
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Username = cleanUser,
            PasswordHash = HashPassword(password),
            Role = "admin",
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _userRepo.CreateAsync(user);
        return (true, null);
    }

    public async Task<(bool Success, string? Username)> ValidateCredentialsAsync(string username, string password)
    {
        if (!_authEnabled) return (true, "anonymous");
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            return (false, null);
        }

        string cleanUser = username.Trim();
        var user = await _userRepo.GetByUsernameAsync(cleanUser);
        if (user != null)
        {
            bool match = VerifyPassword(password, user.PasswordHash, out bool needsRehash);
            if (match)
            {
                if (needsRehash)
                {
                    // Eski düz SHA-256 parolasını şeffaf biçimde güvenli PBKDF2'ye yükselt
                    string upgradedHash = HashPassword(password);
                    _ = _userRepo.UpdatePasswordAsync(user.Username, upgradedHash);
                }
                return (true, user.Username);
            }
            return (false, null);
        }

        // Eğer veritabanında hiç kullanıcı yoksa, ortam değişkenindeki varsayılan kullanıcı geçerlidir
        int userCount = await _userRepo.GetCountAsync();
        if (userCount == 0 && string.Equals(cleanUser, _defaultUser, StringComparison.Ordinal))
        {
            bool match = VerifyPassword(password, _defaultPassHash, out _);
            return match ? (true, _defaultUser) : (false, null);
        }

        return (false, null);
    }

    public string GenerateSessionToken(string username)
    {
        // Periyodik bayat oturum temizliği (bellek sızıntısı koruması)
        if (ActiveSessions.Count > 100)
        {
            var now = DateTime.UtcNow;
            foreach (var kvp in ActiveSessions)
            {
                if (now >= kvp.Value.ExpiresAt)
                {
                    ActiveSessions.TryRemove(kvp.Key, out _);
                }
            }
        }

        byte[] bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        string token = Convert.ToHexString(bytes);
        var expiresAt = DateTime.UtcNow.AddDays(7);
        ActiveSessions[token] = new SessionItem(username, expiresAt);

        if (_sessionRepo != null)
        {
            try
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _sessionRepo.CreateSessionAsync(token, username, expiresAt);
                    }
                    catch { }
                });
            }
            catch { }
        }

        return token;
    }

    public (bool IsValid, string? Username) ValidateSessionToken(string? token)
    {
        if (!_authEnabled) return (true, "anonymous");
        if (string.IsNullOrWhiteSpace(token)) return (false, null);

        var now = DateTime.UtcNow;

        // 1. Fast-Path: In-memory cache kontrolü
        if (ActiveSessions.TryGetValue(token, out var session))
        {
            if (now < session.ExpiresAt)
            {
                return (true, session.Username);
            }

            // Süresi dolmuş oturumu bellekten temizle
            ActiveSessions.TryRemove(token, out _);
            if (_sessionRepo != null)
            {
                _ = Task.Run(async () => { try { await _sessionRepo.DeleteSessionAsync(token); } catch { } });
            }
            return (false, null);
        }

        // 2. Durability Fallback: Konteyner yeniden başladıysa SQLite tablosundan doğrula ve RAM'i hydrate et
        if (_sessionRepo != null)
        {
            try
            {
                var (exists, username, expiresAt) = _sessionRepo.GetSessionAsync(token).GetAwaiter().GetResult();
                if (exists && username != null)
                {
                    if (now < expiresAt)
                    {
                        ActiveSessions[token] = new SessionItem(username, expiresAt);
                        return (true, username);
                    }

                    // Süresi dolmuş oturumu SQLite'tan sil
                    _ = Task.Run(async () => { try { await _sessionRepo.DeleteSessionAsync(token); } catch { } });
                }
            }
            catch { }
        }

        return (false, null);
    }

    public void InvalidateSessionToken(string? token)
    {
        if (!string.IsNullOrWhiteSpace(token))
        {
            ActiveSessions.TryRemove(token, out _);
            if (_sessionRepo != null)
            {
                _ = Task.Run(async () => { try { await _sessionRepo.DeleteSessionAsync(token); } catch { } });
            }
        }
    }

    public string? CheckProxyAuthHeader(IHeaderDictionary headers, IPAddress? remoteIp = null)
    {
        // Güvenlik Sertleştirmesi (CWE-306 / CWE-290 Engelleme):
        // Ters proxy başlıkları varsayılan olarak kabul edilmez.
        // Sadece CORVUS_TRUST_PROXY_HEADERS=true ve güvenilir IP (Loopback veya CORVUS_TRUSTED_PROXIES) ise işletilir.
        if (!_trustProxyHeaders)
        {
            return null;
        }

        if (remoteIp != null && !IPAddress.IsLoopback(remoteIp))
        {
            string? trustedProxies = Environment.GetEnvironmentVariable("CORVUS_TRUSTED_PROXIES");
            if (string.IsNullOrWhiteSpace(trustedProxies))
            {
                return null;
            }

            var allowedIps = trustedProxies.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            if (!allowedIps.Contains(remoteIp.ToString()))
            {
                return null;
            }
        }

        string[] candidateHeaders = [
            "Tailscale-User-Login",
            "Cf-Access-Authenticated-User-Email",
            "Remote-User",
            "X-Forwarded-User"
        ];

        foreach (var h in candidateHeaders)
        {
            if (headers.TryGetValue(h, out var value) && !string.IsNullOrWhiteSpace(value))
            {
                return value.ToString().Trim();
            }
        }

        return null;
    }

    public bool IsLoginRateLimited(string ipOrKey)
    {
        if (string.IsNullOrWhiteSpace(ipOrKey)) return false;

        if (FailedAttempts.TryGetValue(ipOrKey, out var info))
        {
            var now = DateTime.UtcNow;
            if (info.LockoutUntil.HasValue)
            {
                if (now < info.LockoutUntil.Value)
                {
                    return true;
                }
                FailedAttempts.TryRemove(ipOrKey, out _);
                return false;
            }

            if (now - info.FirstAttemptAt > TimeSpan.FromMinutes(1))
            {
                FailedAttempts.TryRemove(ipOrKey, out _);
                return false;
            }
        }
        return false;
    }

    public void RecordLoginFailure(string ipOrKey)
    {
        if (string.IsNullOrWhiteSpace(ipOrKey)) return;

        var now = DateTime.UtcNow;
        FailedAttempts.AddOrUpdate(ipOrKey,
            _ => new FailedAttemptInfo(1, now, null),
            (_, existing) =>
            {
                if (now - existing.FirstAttemptAt > TimeSpan.FromMinutes(1))
                {
                    return new FailedAttemptInfo(1, now, null);
                }
                int newCount = existing.Count + 1;
                DateTime? lockout = newCount >= 5 ? now.AddMinutes(1) : null;
                return new FailedAttemptInfo(newCount, existing.FirstAttemptAt, lockout);
            });

        // Bellek sızıntısını önlemek için bayat girdileri temizle
        if (FailedAttempts.Count > 200)
        {
            foreach (var kvp in FailedAttempts)
            {
                if (now - kvp.Value.FirstAttemptAt > TimeSpan.FromMinutes(2))
                {
                    FailedAttempts.TryRemove(kvp.Key, out _);
                }
            }
        }
    }

    public void ResetLoginAttempts(string ipOrKey)
    {
        if (!string.IsNullOrWhiteSpace(ipOrKey))
        {
            FailedAttempts.TryRemove(ipOrKey, out _);
        }
    }

    public static string HashPassword(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        const int iterations = 100_000;
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            iterations,
            HashAlgorithmName.SHA256,
            32);

        return $"pbkdf2:{iterations}:{Convert.ToHexString(salt)}:{Convert.ToHexString(hash)}";
    }

    public static bool VerifyPassword(string password, string storedHash, out bool needsRehash)
    {
        needsRehash = false;
        if (string.IsNullOrWhiteSpace(storedHash) || string.IsNullOrWhiteSpace(password))
            return false;

        // Modern PBKDF2 Formatı (pbkdf2:iterasyon:salt:hash)
        if (storedHash.StartsWith("pbkdf2:", StringComparison.OrdinalIgnoreCase))
        {
            var parts = storedHash.Split(':');
            if (parts.Length == 4 && int.TryParse(parts[1], out int iterations) && iterations > 0)
            {
                try
                {
                    byte[] salt = Convert.FromHexString(parts[2]);
                    byte[] expectedHash = Convert.FromHexString(parts[3]);
                    byte[] actualHash = Rfc2898DeriveBytes.Pbkdf2(
                        password,
                        salt,
                        iterations,
                        HashAlgorithmName.SHA256,
                        expectedHash.Length);

                    return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
                }
                catch
                {
                    return false;
                }
            }
            return false;
        }

        // Eski düz SHA-256 kontrolü (Geriye dönük uyumluluk)
        byte[] inputHash = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        try
        {
            byte[] legacyExpected = Convert.FromHexString(storedHash);
            bool legacyMatch = CryptographicOperations.FixedTimeEquals(inputHash, legacyExpected);
            if (legacyMatch)
            {
                needsRehash = true; // İlk başarılı girişte PBKDF2'ye yükselt
            }
            return legacyMatch;
        }
        catch
        {
            return false;
        }
    }
}
