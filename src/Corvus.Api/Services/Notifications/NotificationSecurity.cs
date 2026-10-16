using System.Net;
using Corvus.Api.Utils;

namespace Corvus.Api.Services.Notifications;

public static class NotificationSecurity
{
    public static bool ValidateWebhookUrl(string? url, bool isTr, out string? errorMessage)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            errorMessage = isTr ? "Webhook URL boş olamaz." : "Webhook URL cannot be empty.";
            return false;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || 
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            errorMessage = isTr ? "Geçersiz URL veya desteklenmeyen protokol (yalnızca HTTP/HTTPS desteklenir)." : "Invalid URL or unsupported protocol (only HTTP/HTTPS supported).";
            return false;
        }

        string host = uri.DnsSafeHost.Trim('[', ']').ToLowerInvariant();
        if (host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "0.0.0.0" || host == "::")
        {
            errorMessage = isTr 
                ? "Güvenlik uyarısı: Hedef URL yerel veya bulut metadata adresine işaret ediyor (SSRF Koruması)." 
                : "Security warning: Target URL points to local or cloud metadata address (SSRF Protection).";
            return false;
        }

        if (SsrfGuard.IsBlockedHostOrIp(host, out var ssrfErr))
        {
            errorMessage = isTr 
                ? "Güvenlik uyarısı: Hedef URL yerel veya bulut metadata adresine işaret ediyor (SSRF Koruması)." 
                : "Security warning: Target URL points to local or cloud metadata address (SSRF Protection).";
            return false;
        }

        if (IPAddress.TryParse(host, out var ip))
        {
            if (ip.IsIPv4MappedToIPv6)
            {
                ip = ip.MapToIPv4();
            }

            if (IPAddress.IsLoopback(ip) || 
                ip.Equals(IPAddress.Any) || 
                ip.Equals(IPAddress.IPv6Any) || 
                SsrfGuard.IsBlockedIp(ip))
            {
                errorMessage = isTr 
                    ? "Güvenlik uyarısı: Hedef URL yerel veya bulut metadata adresine işaret ediyor (SSRF Koruması)." 
                    : "Security warning: Target URL points to local or cloud metadata address (SSRF Protection).";
                return false;
            }
        }
        else
        {
            // DNS Çözümlemesi ile Rebinding / nip.io koruması
            try
            {
                var addresses = Dns.GetHostAddresses(host);
                foreach (var addr in addresses)
                {
                    var resolvedIp = addr.IsIPv4MappedToIPv6 ? addr.MapToIPv4() : addr;
                    if (IPAddress.IsLoopback(resolvedIp) || 
                        resolvedIp.Equals(IPAddress.Any) || 
                        resolvedIp.Equals(IPAddress.IPv6Any) || 
                        SsrfGuard.IsBlockedIp(resolvedIp))
                    {
                        errorMessage = isTr 
                            ? "Güvenlik uyarısı: Hedef URL yerel veya bulut metadata adresine işaret ediyor (SSRF Koruması)." 
                            : "Security warning: Target URL points to local or cloud metadata address (SSRF Protection).";
                        return false;
                    }
                }
            }
            catch
            {
                // DNS çözümleme hatası
            }
        }

        errorMessage = null;
        return true;
    }
}
