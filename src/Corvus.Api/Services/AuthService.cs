using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services.Auth;

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
    Task<string> GetUserRoleAsync(string username);
    Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(string username, string currentPassword, string newPassword);
    Task<List<UserDto>> GetAllUsersAsync();
    Task<(bool Success, string? ErrorMessage)> CreateUserAsync(string username, string password, string role);
    Task<(bool Success, string? ErrorMessage)> UpdateUserRoleAsync(string id, string newRole, string currentUsername);
    Task<(bool Success, string? ErrorMessage)> DeleteUserAsync(string id, string currentUsername);
}

/// <summary>
/// Kimlik doğrulama çekirdeği: kayıt ve kimlik bilgisi doğrulama. Oturumlar <c>AuthService.Sessions.cs</c>,
/// kullanıcı yönetimi <c>AuthService.Users.cs</c> içindedir.
/// </summary>
public partial class AuthService : IAuthService
{
    private readonly IUserRepository _userRepo;
    private readonly ISettingsRepository _settings;
    private readonly ISessionRepository? _sessionRepo;
    private readonly bool _authEnabled;
    private readonly string _defaultUser;
    private readonly byte[] _defaultPassDigest;
    private readonly bool _trustProxyHeaders;

    private record SessionItem(string Username, DateTime ExpiresAt);
    private static readonly ConcurrentDictionary<string, SessionItem> ActiveSessions = new();

    private record RoleCacheItem(string Role, DateTime CachedAt);
    private static readonly ConcurrentDictionary<string, RoleCacheItem> RoleCache = new(StringComparer.OrdinalIgnoreCase);

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
        // AuthService scoped olduğundan her istekte PBKDF2 çalıştırmamak için yalnızca ucuz bir özet tutulur
        _defaultPassDigest = SHA256.HashData(Encoding.UTF8.GetBytes(rawPass));

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
        if (val != null)
        {
            return string.Equals(val, "true", StringComparison.OrdinalIgnoreCase);
        }

        // Ayar henüz yoksa: Sistemde kullanıcı varsa false (kapalı), hiç kullanıcı yoksa ilk kurulum için true
        bool hasUsers = await HasUsersAsync();
        return !hasUsers;
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

        bool hasUsers = await HasUsersAsync();

        string cleanUser = username?.Trim() ?? string.Empty;
        if (cleanUser.Length < 3)
        {
            return (false, "Kullanıcı adı en az 3 karakter olmalıdır.");
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < PasswordHasher.MinPasswordLength)
        {
            return (false, $"Şifre en az {PasswordHasher.MinPasswordLength} karakter olmalıdır.");
        }

        var existing = await _userRepo.GetByUsernameAsync(cleanUser);
        if (existing != null)
        {
            return (false, "Bu kullanıcı adı zaten kayıtlı.");
        }

        string role = !hasUsers ? "admin" : "viewer";

        var user = new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Username = cleanUser,
            PasswordHash = PasswordHasher.Hash(password),
            Role = role,
            CreatedAt = DateTime.UtcNow.ToString("o")
        };

        await _userRepo.CreateAsync(user);

        if (!hasUsers)
        {
            // İlk kullanıcı admin yapıldıktan sonra açık kayıt varsayılan olarak kapatılır
            await _settings.SetAsync("registration_enabled", "false");
        }

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
            bool match = PasswordHasher.Verify(password, user.PasswordHash, out bool needsRehash);
            if (match)
            {
                if (needsRehash)
                {
                    // Eski SHA-256 veya düşük iterasyonlu PBKDF2 parolasını şeffaf biçimde güncel PBKDF2'ye yükselt
                    string upgradedHash = PasswordHasher.Hash(password);
                    await _userRepo.UpdatePasswordAsync(user.Username, upgradedHash);
                }
                return (true, user.Username);
            }
            return (false, null);
        }

        // Eğer veritabanında hiç kullanıcı yoksa, ortam değişkenindeki varsayılan kullanıcı geçerlidir
        int userCount = await _userRepo.GetCountAsync();
        if (userCount == 0 && string.Equals(cleanUser, _defaultUser, StringComparison.Ordinal))
        {
            bool match = VerifyDefaultPassword(password);
            return match ? (true, _defaultUser) : (false, null);
        }

        return (false, null);
    }

    private bool VerifyDefaultPassword(string password)
    {
        if (string.IsNullOrEmpty(password)) return false;
        byte[] digest = SHA256.HashData(Encoding.UTF8.GetBytes(password));
        return CryptographicOperations.FixedTimeEquals(digest, _defaultPassDigest);
    }
}
