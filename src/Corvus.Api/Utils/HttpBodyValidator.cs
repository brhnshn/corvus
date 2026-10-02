using System.Buffers;
using System.Text;
using System.Text.RegularExpressions;

namespace Corvus.Api.Utils;

public static class HttpBodyValidator
{
    private const int DefaultMaxScanBytes = 65536; // 64 KB bellek tavanı (OOM ve DoS önleme)
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromMilliseconds(200);

    /// <summary>
    /// HTTP yanıt akışını en fazla maxScanBytes (varsayılan 64 KB) kadar okuyarak
    /// beklenen anahtar kelime veya Regex ifadesinin mevcut olup olmadığını denetler.
    /// Akış bellek havuzu (ArrayPool) ile sıfır gereksiz tahsisatla taranır.
    /// </summary>
    public static async Task<(bool Success, string? ErrorMessage)> ValidateAsync(
        HttpContent content,
        string? expectedPattern,
        CancellationToken ct = default,
        int maxScanBytes = DefaultMaxScanBytes)
    {
        if (string.IsNullOrWhiteSpace(expectedPattern))
        {
            return (true, null);
        }

        string trimmedPattern = expectedPattern.Trim();
        if (string.IsNullOrEmpty(trimmedPattern))
        {
            return (true, null);
        }

        byte[] rentedBuffer = ArrayPool<byte>.Shared.Rent(maxScanBytes);
        int totalBytesRead = 0;

        try
        {
            using var stream = await content.ReadAsStreamAsync(ct);
            while (totalBytesRead < maxScanBytes)
            {
                int needed = maxScanBytes - totalBytesRead;
                int read = await stream.ReadAsync(rentedBuffer.AsMemory(totalBytesRead, needed), ct);
                if (read == 0)
                {
                    break;
                }
                totalBytesRead += read;
            }

            string scannedText = Encoding.UTF8.GetString(rentedBuffer, 0, totalBytesRead);

            // 1. Düz Metin / Anahtar Kelime Denetimi (Hızlı ve Büyük/Küçük harf duyarsız)
            if (scannedText.Contains(trimmedPattern, StringComparison.OrdinalIgnoreCase))
            {
                return (true, null);
            }

            // 2. Regex Denetimi (Regex karakterleri veya özel desenler içeriyorsa)
            try
            {
                if (Regex.IsMatch(scannedText, trimmedPattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, RegexTimeout))
                {
                    return (true, null);
                }
            }
            catch (ArgumentException)
            {
                // Kullanıcı regex kurallarına uymayan bir düz metin girmiş olabilir (örn: unescaped [ veya ()), yutulur.
            }
            catch (RegexMatchTimeoutException)
            {
                return (false, "Yanıt içeriği regex doğrulaması zaman aşımına uğradı (ReDoS koruması).");
            }

            return (false, $"Beklenen yanıt içeriği ('{trimmedPattern}') yanıtta bulunamadı.");
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            return (false, $"Gövde doğrulama hatası: {ex.Message}");
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(rentedBuffer);
        }
    }

    /// <summary>
    /// Bir metin dizesi üzerinde beklenen anahtar kelime veya Regex ifadesini doğrular (Testler ve bellek içi kullanım için).
    /// </summary>
    public static bool IsMatch(string content, string? expectedPattern)
    {
        if (string.IsNullOrWhiteSpace(expectedPattern))
        {
            return true;
        }

        string trimmedPattern = expectedPattern.Trim();
        if (string.IsNullOrEmpty(trimmedPattern))
        {
            return true;
        }

        if (content.Contains(trimmedPattern, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        try
        {
            return Regex.IsMatch(content, trimmedPattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, RegexTimeout);
        }
        catch
        {
            return false;
        }
    }
}
