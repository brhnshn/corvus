using System.Security.Cryptography;
using System.Text;
using Corvus.Api.Data;
using Corvus.Api.Services.Auth;

namespace Corvus.Api.Services.Deployments;

public readonly record struct DeployWebhookTokenCheck(bool IsValid, int StatusCode, string? ErrorMessage);

public interface IDeployWebhookTokenValidator
{
    Task<DeployWebhookTokenCheck> ValidateAsync(string? token, string clientIp);
}

/// <summary>
/// Gelen dağıtım webhook token'ını doğrular: IP bazlı brute-force kilidi ve sabit zamanlı karşılaştırma.
/// </summary>
public sealed class DeployWebhookTokenValidator : IDeployWebhookTokenValidator
{
    private readonly ISettingsRepository _settingsRepo;
    private readonly ILoginRateLimiter _rateLimiter;
    private readonly ILogger<DeployWebhookTokenValidator> _logger;

    public DeployWebhookTokenValidator(ISettingsRepository settingsRepo, ILoginRateLimiter rateLimiter, ILogger<DeployWebhookTokenValidator> logger)
    {
        _settingsRepo = settingsRepo;
        _rateLimiter = rateLimiter;
        _logger = logger;
    }

    public async Task<DeployWebhookTokenCheck> ValidateAsync(string? token, string clientIp)
    {
        // Token brute-force koruması: IP başına dakikada 5 hatalı denemeden sonra 1 dakika kilit
        string rateLimitKey = $"deploy-hook:{clientIp}";
        if (_rateLimiter.IsRateLimited(rateLimitKey))
        {
            return new(false, 429, "Çok fazla hatalı deneme. Lütfen bir dakika sonra tekrar deneyin.");
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return new(false, 400, "Token boş olamaz.");
        }

        string? expectedToken = await _settingsRepo.GetAsync("deploy_webhook_token");
        if (string.IsNullOrWhiteSpace(expectedToken))
        {
            expectedToken = Environment.GetEnvironmentVariable("CORVUS_DEPLOY_TOKEN");
        }

        if (string.IsNullOrWhiteSpace(expectedToken))
        {
            _logger.LogWarning("Inbound deploy webhook çağrıldı ancak sistemde hiçbir token tanımlanmamış.");
            return new(false, 403, "Deploy webhook belirteci yapılandırılmamış (Ayarlardan veya CORVUS_DEPLOY_TOKEN ile tanımlayın).");
        }

        if (!FixedTimeTokenEquals(token, expectedToken))
        {
            _rateLimiter.RecordFailure(rateLimitKey);
            _logger.LogWarning("Geçersiz deploy webhook token denemesi: {Ip}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(clientIp));
            return new(false, 401, "Yetkilendirme başarısız: Geçersiz webhook belirteci.");
        }

        _rateLimiter.Reset(rateLimitKey);
        return new(true, 200, null);
    }

    /// <summary>
    /// Önce SHA-256 özetleri alınarak karşılaştırılır; böylece token uzunluğu da zamanlama üzerinden sızmaz.
    /// </summary>
    public static bool FixedTimeTokenEquals(string provided, string expected)
    {
        byte[] a = SHA256.HashData(Encoding.UTF8.GetBytes(provided));
        byte[] b = SHA256.HashData(Encoding.UTF8.GetBytes(expected));
        return CryptographicOperations.FixedTimeEquals(a, b);
    }
}
