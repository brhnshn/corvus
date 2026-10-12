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
}
