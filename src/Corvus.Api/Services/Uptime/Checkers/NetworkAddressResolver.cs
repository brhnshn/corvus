namespace Corvus.Api.Services.Uptime.Checkers;

public static class NetworkAddressResolver
{
    private static string? _cachedResolvedLoopback;
    private static readonly object _loopbackLock = new();

    public static bool IsLoopbackHost(string host)
    {
        return host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
               host == "127.0.0.1" ||
               host == "::1";
    }

    public static string ResolveContainerLoopback()
    {
        if (_cachedResolvedLoopback != null)
        {
            return _cachedResolvedLoopback;
        }

        lock (_loopbackLock)
        {
            if (_cachedResolvedLoopback != null)
            {
                return _cachedResolvedLoopback;
            }

            string? overrideHost = Environment.GetEnvironmentVariable("CORVUS_HOST_GATEWAY")
                                ?? Environment.GetEnvironmentVariable("CORVUS_INTERNAL_HOST");
            if (!string.IsNullOrWhiteSpace(overrideHost))
            {
                return _cachedResolvedLoopback = overrideHost.Trim();
            }

            bool inContainer = File.Exists("/.dockerenv") ||
                               string.Equals(Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"), "true", StringComparison.OrdinalIgnoreCase);

            if (inContainer)
            {
                try
                {
                    var entry = System.Net.Dns.GetHostEntry("host.docker.internal");
                    if (entry.AddressList.Length > 0)
                    {
                        return _cachedResolvedLoopback = "host.docker.internal";
                    }
                }
                catch { }

                try
                {
                    var gateway = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
                        .Where(n => n.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up)
                        .SelectMany(n => n.GetIPProperties().GatewayAddresses)
                        .Select(g => g.Address)
                        .FirstOrDefault(a => a.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);

                    if (gateway != null)
                    {
                        return _cachedResolvedLoopback = gateway.ToString();
                    }
                }
                catch { }
            }

            return _cachedResolvedLoopback = "localhost";
        }
    }

    public static string ResolveHealthCheckUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            if (IsLoopbackHost(uri.Host))
            {
                string resolvedHost = ResolveContainerLoopback();
                if (resolvedHost != uri.Host)
                {
                    var builder = new UriBuilder(uri) { Host = resolvedHost };
                    return builder.Uri.ToString();
                }
            }
        }
        catch { }
        return url;
    }

    public static string ResolveHealthCheckHost(string host)
    {
        if (IsLoopbackHost(host))
        {
            return ResolveContainerLoopback();
        }
        return host;
    }

    public static string ExtractHost(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        raw = raw.Trim();
        if (raw.StartsWith("ping://", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw[7..];
        }
        else if (raw.Contains("://", StringComparison.Ordinal))
        {
            try
            {
                var uri = new Uri(raw);
                return uri.Host;
            }
            catch { }
        }

        int slashIdx = raw.IndexOf('/');
        if (slashIdx >= 0) raw = raw[..slashIdx];
        int colonIdx = raw.IndexOf(':');
        if (colonIdx >= 0) raw = raw[..colonIdx];
        return raw.Trim();
    }

    public static string NormalizeHttpUrl(string url)
    {
        var trimmed = url.Trim();
        if (!trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            return $"http://{trimmed}";
        }
        return trimmed;
    }
}
