using System.Net.Http.Headers;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public record ParsedImageReference(
    string Registry,
    string Repository,
    string Tag,
    string FullReference
);

public interface IOciRegistryClient
{
    ParsedImageReference ParseImage(string image);
    Task<string?> GetRemoteDigestAsync(string image, CancellationToken cancellationToken = default);
    Task<ContainerImageUpdateInfo> CheckContainerUpdateAsync(
        string containerId, 
        string imageName, 
        string? localImageId, 
        List<string>? repoDigests, 
        CancellationToken cancellationToken = default);
}

public class OciRegistryClient : IOciRegistryClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OciRegistryClient> _logger;

    public OciRegistryClient(HttpClient httpClient, ILogger<OciRegistryClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.Timeout = TimeSpan.FromSeconds(10);
    }

    public ParsedImageReference ParseImage(string image)
    {
        if (string.IsNullOrWhiteSpace(image))
        {
            return new ParsedImageReference("registry-1.docker.io", "library/unknown", "latest", image);
        }

        string clean = image.Trim();
        // sha256 digest eki varsa kaldır (örn: nginx@sha256:...)
        int atIdx = clean.IndexOf('@');
        if (atIdx >= 0)
        {
            clean = clean[..atIdx];
        }

        string tag = "latest";
        int lastColon = clean.LastIndexOf(':');
        int lastSlash = clean.LastIndexOf('/');

        // Tag ayrımı (colon slash'tan sonraysa tag'dir)
        if (lastColon > lastSlash)
        {
            tag = clean[(lastColon + 1)..];
            clean = clean[..lastColon];
        }

        string registry;
        string repository;

        string[] parts = clean.Split('/');
        if (parts.Length == 1)
        {
            // Örn: "nginx" -> Docker Hub resmi kütüphanesi
            registry = "registry-1.docker.io";
            repository = $"library/{parts[0]}";
        }
        else if (parts.Length == 2 && !parts[0].Contains('.') && !parts[0].Contains(':'))
        {
            // Örn: "portainer/portainer-ce" -> Docker Hub kullanıcı deposu
            registry = "registry-1.docker.io";
            repository = clean;
        }
        else
        {
            // Host içerenler: ghcr.io, quay.io, docker.io veya özel registry
            registry = parts[0];
            repository = string.Join('/', parts.Skip(1));

            if (registry.Equals("docker.io", StringComparison.OrdinalIgnoreCase))
            {
                registry = "registry-1.docker.io";
                if (!repository.Contains('/'))
                {
                    repository = $"library/{repository}";
                }
            }
        }

        return new ParsedImageReference(registry, repository, tag, image);
    }

    public async Task<string?> GetRemoteDigestAsync(string image, CancellationToken cancellationToken = default)
    {
        var parsed = ParseImage(image);
        try
        {
            string? token = await AcquireBearerTokenAsync(parsed, cancellationToken);

            string manifestUrl = $"https://{parsed.Registry}/v2/{parsed.Repository}/manifests/{parsed.Tag}";
            using var req = new HttpRequestMessage(HttpMethod.Head, manifestUrl);

            // OCI ve Docker v2 manifest kabul header'ları
            req.Headers.TryAddWithoutValidation("Accept", 
                "application/vnd.docker.distribution.manifest.v2+json, " +
                "application/vnd.docker.distribution.manifest.list.v2+json, " +
                "application/vnd.oci.image.manifest.v1+json, " +
                "application/vnd.oci.image.index.v1+json");

            if (!string.IsNullOrEmpty(token))
            {
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }

            using var resp = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

            // 401 Unauthorized durumunda www-authenticate challenge üzerinden tekrar dene
            if (resp.StatusCode == System.Net.HttpStatusCode.Unauthorized && string.IsNullOrEmpty(token))
            {
                string? challengeToken = await HandleAuthChallengeAsync(resp.Headers.WwwAuthenticate, parsed, cancellationToken);
                if (!string.IsNullOrEmpty(challengeToken))
                {
                    using var retryReq = new HttpRequestMessage(HttpMethod.Head, manifestUrl);
                    retryReq.Headers.TryAddWithoutValidation("Accept", 
                        "application/vnd.docker.distribution.manifest.v2+json, " +
                        "application/vnd.docker.distribution.manifest.list.v2+json, " +
                        "application/vnd.oci.image.manifest.v1+json, " +
                        "application/vnd.oci.image.index.v1+json");
                    retryReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", challengeToken);

                    using var retryResp = await _httpClient.SendAsync(retryReq, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
                    if (retryResp.IsSuccessStatusCode)
                    {
                        return ExtractDigestFromHeaders(retryResp);
                    }
                }
            }

            if (resp.IsSuccessStatusCode)
            {
                return ExtractDigestFromHeaders(resp);
            }

            _logger.LogWarning("Uzak registry manifest HEAD isteği başarısız ({StatusCode}): {Url}", resp.StatusCode, manifestUrl);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Uzak registry digest kontrolü sırasında hata: {Image}", image);
            return null;
        }
    }

    private static string? ExtractDigestFromHeaders(HttpResponseMessage response)
    {
        // 1. Docker-Content-Digest
        if (response.Headers.TryGetValues("Docker-Content-Digest", out var digests))
        {
            var digest = digests.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(digest))
            {
                return digest.Trim('"', ' ');
            }
        }

        // 2. ETag fallback (sha256:...)
        var etag = response.Headers.ETag?.Tag?.Trim('"', ' ');
        if (!string.IsNullOrWhiteSpace(etag) && etag.StartsWith("sha256:", StringComparison.OrdinalIgnoreCase))
        {
            return etag;
        }

        return null;
    }

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

    public async Task<ContainerImageUpdateInfo> CheckContainerUpdateAsync(
        string containerId, 
        string imageName, 
        string? localImageId, 
        List<string>? repoDigests, 
        CancellationToken cancellationToken = default)
    {
        var parsed = ParseImage(imageName);
        var result = new ContainerImageUpdateInfo
        {
            ContainerId = containerId,
            Image = imageName,
            Registry = parsed.Registry,
            CheckedAt = DateTime.UtcNow
        };

        // Yerel manifest digest'ını çıkar (RepoDigests genellikle "nginx@sha256:abc..." içerir)
        string? localDigest = null;
        if (repoDigests != null && repoDigests.Count > 0)
        {
            foreach (var rd in repoDigests)
            {
                int atIdx = rd.IndexOf('@');
                if (atIdx >= 0)
                {
                    localDigest = rd[(atIdx + 1)..];
                    break;
                }
            }
        }

        // RepoDigests yoksa localImageId (sha256:...) fallback
        localDigest ??= localImageId;
        result.LocalDigest = localDigest;

        var remoteDigest = await GetRemoteDigestAsync(imageName, cancellationToken);
        result.RemoteDigest = remoteDigest;

        if (string.IsNullOrEmpty(remoteDigest))
        {
            result.HasUpdate = false;
            result.Error = "Uzak registry digest bilgisi alınamadı veya imaj bulunamadı.";
            return result;
        }

        if (string.IsNullOrEmpty(localDigest))
        {
            // Yerel digest bilinmiyorsa ve uzak digest varsa güncelleme olabilir varsayımı
            result.HasUpdate = true;
            return result;
        }

        // Temiz karşılaştırma (örn: sha256:... ile sha256:...)
        bool isMatching = string.Equals(localDigest.Trim(), remoteDigest.Trim(), StringComparison.OrdinalIgnoreCase);
        result.HasUpdate = !isMatching;

        return result;
    }
}
