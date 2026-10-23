using System.Net.Http.Headers;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

// Registry anonim Bearer token edinimi ve WWW-Authenticate challenge ayrıştırma
public partial class OciRegistryClient
{
    private async Task<string?> AcquireBearerTokenAsync(ParsedImageReference parsed, CancellationToken cancellationToken)
    {
        try
        {
            string? authUrl = null;
            if (parsed.Registry.Equals("registry-1.docker.io", StringComparison.OrdinalIgnoreCase))
            {
                authUrl = $"https://auth.docker.io/token?service=registry.docker.io&scope=repository:{parsed.Repository}:pull";
            }
            else if (parsed.Registry.Equals("ghcr.io", StringComparison.OrdinalIgnoreCase))
            {
                authUrl = $"https://ghcr.io/token?service=ghcr.io&scope=repository:{parsed.Repository}:pull";
            }

            if (authUrl == null)
            {
                return null;
            }

            using var resp = await _httpClient.GetAsync(authUrl, cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                return null;
            }

            using var stream = await resp.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            if (doc.RootElement.TryGetProperty("token", out var tokenProp))
            {
                return tokenProp.GetString();
            }
            if (doc.RootElement.TryGetProperty("access_token", out var accessProp))
            {
                return accessProp.GetString();
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Registry token alma başarısız: {Registry}/{Repo}", parsed.Registry, parsed.Repository);
        }

        return null;
    }

    private async Task<string?> HandleAuthChallengeAsync(
        HttpHeaderValueCollection<AuthenticationHeaderValue> challenges, 
        ParsedImageReference parsed, 
        CancellationToken cancellationToken)
    {
        var bearerChallenge = challenges.FirstOrDefault(c => c.Scheme.Equals("Bearer", StringComparison.OrdinalIgnoreCase));
        if (bearerChallenge?.Parameter == null)
        {
            return null;
        }

        // realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:library/nginx:pull"
        var param = bearerChallenge.Parameter;
        string? realm = ExtractParam(param, "realm");
        string? service = ExtractParam(param, "service");
        string? scope = ExtractParam(param, "scope") ?? $"repository:{parsed.Repository}:pull";

        if (string.IsNullOrEmpty(realm))
        {
            return null;
        }

        var uriBuilder = new UriBuilder(realm);
        var query = new List<string>();
        if (!string.IsNullOrEmpty(service)) query.Add($"service={Uri.EscapeDataString(service)}");
        if (!string.IsNullOrEmpty(scope)) query.Add($"scope={Uri.EscapeDataString(scope)}");

        uriBuilder.Query = string.Join("&", query);

        try
        {
            using var tokenResp = await _httpClient.GetAsync(uriBuilder.Uri, cancellationToken);
            if (!tokenResp.IsSuccessStatusCode) return null;

            using var stream = await tokenResp.Content.ReadAsStreamAsync(cancellationToken);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            if (doc.RootElement.TryGetProperty("token", out var tokenProp)) return tokenProp.GetString();
            if (doc.RootElement.TryGetProperty("access_token", out var accessProp)) return accessProp.GetString();
        }
        catch
        {
            // Challenge çözülemedi
        }

        return null;
    }

    private static string? ExtractParam(string headerParam, string key)
    {
        int keyIdx = headerParam.IndexOf($"{key}=\"", StringComparison.OrdinalIgnoreCase);
        if (keyIdx < 0) return null;

        int start = keyIdx + key.Length + 2;
        int end = headerParam.IndexOf('"', start);
        if (end < 0) return null;

        return headerParam[start..end];
    }
}
