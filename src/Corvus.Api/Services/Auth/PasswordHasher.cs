using System.Security.Cryptography;
using System.Text;

namespace Corvus.Api.Services.Auth;

/// <summary>
/// PBKDF2-HMAC-SHA256 parola özetleme ve doğrulama; eski SHA-256 ve düşük iterasyonlu özetler için yükseltme sinyali verir.
/// </summary>
public static class PasswordHasher
{

    public const int MinPasswordLength = 8;

    // OWASP 2023 önerisi: PBKDF2-HMAC-SHA256 için en az 600.000 iterasyon
    public const int Pbkdf2Iterations = 600_000;

    public static string Hash(string password)
    {
        byte[] salt = RandomNumberGenerator.GetBytes(16);
        byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Pbkdf2Iterations,
            HashAlgorithmName.SHA256,
            32);

        return $"pbkdf2:{Pbkdf2Iterations}:{Convert.ToHexString(salt)}:{Convert.ToHexString(hash)}";
    }

    public static bool Verify(string password, string storedHash, out bool needsRehash)
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

                    bool match = CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
                    // Eski düşük iterasyonlu hash'leri ilk başarılı girişte güncel iterasyona yükselt
                    needsRehash = match && iterations < Pbkdf2Iterations;
                    return match;
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
