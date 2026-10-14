using System.Net.Http.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IUpdateCheckerService
{
    string CurrentVersion { get; }
    Task<VersionInfoDto> GetVersionInfoAsync(CancellationToken ct = default);
}

public class UpdateCheckerService : IUpdateCheckerService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<UpdateCheckerService> _logger;

    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(6);
    private VersionInfoDto? _cachedVersionInfo;
    private DateTime _lastCheckedAt = DateTime.MinValue;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public string CurrentVersion { get; }

    public UpdateCheckerService(HttpClient httpClient, ILogger<UpdateCheckerService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        CurrentVersion = ResolveCurrentVersion();
    }

    private static string ResolveCurrentVersion()
    {
        var env = Environment.GetEnvironmentVariable("CORVUS_VERSION");
        if (!string.IsNullOrWhiteSpace(env))
        {
            return CleanVersionString(env);
        }

        var asmVersion = typeof(UpdateCheckerService).Assembly.GetName().Version;
        if (asmVersion != null && !(asmVersion.Major == 0 && asmVersion.Minor == 0 && asmVersion.Build == 0))
        {
            return $"{asmVersion.Major}.{asmVersion.Minor}.{Math.Max(0, asmVersion.Build)}";
        }

        try
        {
            var dir = AppContext.BaseDirectory;
            for (int i = 0; i < 5; i++)
            {
                var candidate = Path.Combine(dir, "CHANGELOG.md");
                if (File.Exists(candidate))
                {
                    var text = File.ReadAllText(candidate);
                    var match = System.Text.RegularExpressions.Regex.Match(text, @"##\s*\[(\d+\.\d+\.\d+)\]");
                    if (match.Success)
                    {
                        return match.Groups[1].Value;
                    }
                    break;
                }
                var parent = Directory.GetParent(dir);
                if (parent == null) break;
                dir = parent.FullName;
            }
        }
        catch
        {
            // Ignore in restricted environments
        }

        return "1.0.0";
    }

    public async Task<VersionInfoDto> GetVersionInfoAsync(CancellationToken ct = default)
    {
        if (_cachedVersionInfo != null && DateTime.UtcNow - _lastCheckedAt < CacheDuration)
        {
            return _cachedVersionInfo;
        }

        await _lock.WaitAsync(ct);
        try
        {
            if (_cachedVersionInfo != null && DateTime.UtcNow - _lastCheckedAt < CacheDuration)
            {
                return _cachedVersionInfo;
            }

            var latestVersion = CurrentVersion;
            var isUpdateAvailable = false;
            var releaseUrl = $"https://github.com/brhnshn/corvus/releases";

            using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, timeoutCts.Token);

            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/repos/brhnshn/corvus/releases/latest");
                request.Headers.Add("User-Agent", "Corvus-Server/1.0");
                request.Headers.Add("Accept", "application/vnd.github.v3+json");

                using var response = await _httpClient.SendAsync(request, linkedCts.Token);
                if (response.IsSuccessStatusCode)
                {
                    var release = await response.Content.ReadFromJsonAsync(
                        CorvusJsonSerializerContext.Default.GitHubReleaseDto,
                        ct
                    );

                    if (release != null && !string.IsNullOrWhiteSpace(release.tag_name))
                    {
                        latestVersion = CleanVersionString(release.tag_name);
                        isUpdateAvailable = IsNewerVersion(latestVersion, CurrentVersion);
                        if (!string.IsNullOrWhiteSpace(release.html_url))
                        {
                            releaseUrl = release.html_url;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to check latest release from GitHub API (offline or rate limited).");
            }

            _cachedVersionInfo = new VersionInfoDto(
                CurrentVersion,
                latestVersion,
                isUpdateAvailable,
                releaseUrl
            );
            _lastCheckedAt = DateTime.UtcNow;

            return _cachedVersionInfo;
        }
        finally
        {
            _lock.Release();
        }
    }

    public static string CleanVersionString(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "1.0.0";
        var trimmed = raw.Trim().TrimStart('v', 'V');
        var dashIndex = trimmed.IndexOf('-');
        if (dashIndex > 0)
        {
            trimmed = trimmed[..dashIndex];
        }
        return trimmed;
    }

    public static bool IsNewerVersion(string latestStr, string currentStr)
    {
        var cleanLatest = CleanVersionString(latestStr);
        var cleanCurrent = CleanVersionString(currentStr);

        if (Version.TryParse(cleanLatest, out var latest) && Version.TryParse(cleanCurrent, out var current))
        {
            return latest > current;
        }

        // Fallback segment comparison
        var latestParts = cleanLatest.Split('.').Select(p => int.TryParse(p, out var v) ? v : 0).ToArray();
        var currentParts = cleanCurrent.Split('.').Select(p => int.TryParse(p, out var v) ? v : 0).ToArray();

        int maxLen = Math.Max(latestParts.Length, currentParts.Length);
        for (int i = 0; i < maxLen; i++)
        {
            int l = i < latestParts.Length ? latestParts[i] : 0;
            int c = i < currentParts.Length ? currentParts[i] : 0;
            if (l > c) return true;
            if (l < c) return false;
        }

        return false;
    }
}
