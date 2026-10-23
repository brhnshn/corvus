using System.Net;
using System.Security.Cryptography;

namespace Corvus.Api.Services;

// Oturum belirteci yaşam döngüsü (RAM önbelleği + SQLite kalıcılığı) ve ters proxy başlık doğrulaması
public partial class AuthService
{
    public static void CleanExpiredSessions()
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

    public string GenerateSessionToken(string username)
    {
        // Periyodik bayat oturum temizliği (bellek sızıntısı koruması)
        CleanExpiredSessions();

        byte[] bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        string token = Convert.ToHexString(bytes);
        var expiresAt = DateTime.UtcNow.AddDays(7);
        ActiveSessions[token] = new SessionItem(username, expiresAt);

        if (_sessionRepo != null)
        {
            try
            {
                _ = _sessionRepo.CreateSessionAsync(token, username, expiresAt);
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
                try { _ = _sessionRepo.DeleteSessionAsync(token); } catch { }
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
                    try { _ = _sessionRepo.DeleteSessionAsync(token); } catch { }
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
                try { _ = _sessionRepo.DeleteSessionAsync(token); } catch { }
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
}
