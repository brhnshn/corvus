using System.Collections.Concurrent;

namespace Corvus.Api.Services.Auth;

public interface ILoginRateLimiter
{
    bool IsRateLimited(string ipOrKey);
    void RecordFailure(string ipOrKey);
    void Reset(string ipOrKey);
}

/// <summary>
/// Kayan pencereli brute-force kilidi: 1 dakika içinde 5 hatalı denemeden sonra anahtar 1 dakika kilitlenir.
/// Giriş ve deploy webhook uç noktaları ortak kullanır (singleton).
/// </summary>
public sealed class LoginRateLimiter : ILoginRateLimiter
{
    private record FailedAttemptInfo(int Count, DateTime FirstAttemptAt, DateTime? LockoutUntil);
    private readonly ConcurrentDictionary<string, FailedAttemptInfo> FailedAttempts = new();

    public bool IsRateLimited(string ipOrKey)
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

    public void RecordFailure(string ipOrKey)
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

    public void Reset(string ipOrKey)
    {
        if (!string.IsNullOrWhiteSpace(ipOrKey))
        {
            FailedAttempts.TryRemove(ipOrKey, out _);
        }
    }
}
