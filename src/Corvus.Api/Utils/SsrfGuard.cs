using System.Net;
using System.Net.Sockets;

namespace Corvus.Api.Utils;

public static class SsrfGuard
{
    public static bool IsBlockedIp(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6)
        {
            ip = ip.MapToIPv4();
        }

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            byte[] bytes = ip.GetAddressBytes();
            // 169.254.0.0/16 (IPv4 Link-Local, includes 169.254.169.254 and cloud metadata)
            if (bytes[0] == 169 && bytes[1] == 254)
            {
                return true;
            }
            // 0.0.0.0/8
            if (bytes[0] == 0)
            {
                return true;
            }
        }
        else if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            // fe80::/10 (IPv6 Link-Local) and fec0::/10 (IPv6 Site-Local)
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal)
            {
                return true;
            }
            if (ip.Equals(IPAddress.IPv6Any))
            {
                return true;
            }
        }

        return false;
    }

    public static bool IsBlockedHostOrIp(string hostOrIp, out string? errorMessage)
    {
        errorMessage = null;
        if (string.IsNullOrWhiteSpace(hostOrIp))
        {
            return false;
        }

        string clean = hostOrIp.Trim().Trim('[', ']').ToLowerInvariant();

        // Check common cloud metadata hostnames
        if (clean == "169.254.169.254" || 
            clean == "metadata.google.internal" || 
            clean == "metadata" ||
            (clean.StartsWith("metadata.", StringComparison.OrdinalIgnoreCase) && clean.EndsWith(".internal", StringComparison.OrdinalIgnoreCase)))
        {
            errorMessage = "Güvenlik uyarısı: Hedef adres bulut metadata veya yasaklı link-local servisine işaret ediyor (SSRF Koruması).";
            return true;
        }

        if (IPAddress.TryParse(clean, out var parsedIp))
        {
            if (IsBlockedIp(parsedIp))
            {
                errorMessage = "Güvenlik uyarısı: Hedef IP adresi bulut metadata veya yasaklı link-local aralığında (SSRF Koruması).";
                return true;
            }
            return false;
        }

        // DNS resolution to protect against nip.io/sslip.io and DNS rebinding to metadata
        try
        {
            var addresses = Dns.GetHostAddresses(clean);
            foreach (var addr in addresses)
            {
                if (IsBlockedIp(addr))
                {
                    errorMessage = "Güvenlik uyarısı: Hedef alan adı bulut metadata veya yasaklı link-local IP adresine çözümleniyor (SSRF Koruması).";
                    return true;
                }
            }
        }
        catch
        {
            // Ignore DNS lookup failure here; network operations will fail safely later if host is invalid
        }

        return false;
    }
}
