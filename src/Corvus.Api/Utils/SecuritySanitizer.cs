namespace Corvus.Api.Utils;

public static class SecuritySanitizer
{
    /// <summary>
    /// Log Forging / CRLF Injection (CWE-117) önlemek için kullanıcı veya harici kaynaklı string girdilerini temizler.
    /// Satır başı (\r, \n) ve zararlı kontrol karakterlerini temizleyerek log bütünlüğünü korur.
    /// </summary>
    public static string SanitizeLog(string? input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return string.Empty;
        }

        return input.Replace("\r", "").Replace("\n", "").Trim();
    }

    /// <summary>
    /// Gizli belirteçleri (push token, webhook token vb.) bildirim ve log çıktılarında maskeleyerek ifşayı önler.
    /// Ayırt edilebilirlik için yalnızca ilk 4 karakter bırakılır.
    /// </summary>
    public static string MaskToken(string? token)
    {
        if (string.IsNullOrEmpty(token))
        {
            return string.Empty;
        }

        return token.Length <= 8 ? "******" : $"{token[..4]}******";
    }
}
