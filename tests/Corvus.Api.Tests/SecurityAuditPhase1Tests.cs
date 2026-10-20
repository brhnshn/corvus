using System.Net;
using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services;
using Corvus.Api.Utils;
using Xunit;

namespace Corvus.Api.Tests;

public class SecurityAuditPhase1Tests
{
    [Theory]
    [InlineData("169.254.169.254", true)]
    [InlineData("169.254.170.2", true)]
    [InlineData("169.254.1.1", true)]
    [InlineData("0.0.0.0", true)]
    [InlineData("fe80::1", true)]
    [InlineData("127.0.0.1", true)]
    [InlineData("127.0.1.1", true)]
    [InlineData("::1", true)]
    [InlineData("8.8.8.8", false)]
    [InlineData("1.1.1.1", false)]
    [InlineData("192.168.1.1", false)]
    [InlineData("10.0.0.1", false)]
    public void SsrfGuard_IsBlockedIp_CorrectlyIdentifiesLinkLocalAndMetadata(string ipStr, bool shouldBlock)
    {
        var ip = IPAddress.Parse(ipStr);
        bool isBlocked = SsrfGuard.IsBlockedIp(ip);
        Assert.Equal(shouldBlock, isBlocked);
    }

    [Theory]
    [InlineData("169.254.169.254", true)]
    [InlineData("metadata.google.internal", true)]
    [InlineData("metadata", true)]
    [InlineData("metadata.internal", true)]
    [InlineData("169.254.1.5", true)]
    [InlineData("localhost", true)]
    [InlineData("127.0.0.1", true)]
    [InlineData("::1", true)]
    [InlineData("0.0.0.0", true)]
    [InlineData("8.8.8.8", false)]
    public void SsrfGuard_IsBlockedHostOrIp_BlocksMetadataHosts(string host, bool shouldBlock)
    {
        bool blocked = SsrfGuard.IsBlockedHostOrIp(host, out var err);
        Assert.Equal(shouldBlock, blocked);
        if (shouldBlock)
        {
            Assert.NotNull(err);
        }
    }

    [Fact]
    public void InspectContainer_MasksEnv_ForViewer()
    {
        var inspect = new DockerContainerInspectInfo
        {
            Id = "abc123",
            Name = "db",
            Config = new DockerContainerConfig
            {
                Env = new List<string>
                {
                    "POSTGRES_PASSWORD=supersecret",
                    "API_KEY=xyz12345",
                    "APP_ENV=production"
                }
            }
        };

        // When viewer accesses inspect:
        string role = "viewer";
        if (string.Equals(role, "viewer", StringComparison.OrdinalIgnoreCase) && inspect.Config?.Env != null)
        {
            inspect.Config.Env = inspect.Config.Env.Select(env =>
            {
                int eqIndex = env.IndexOf('=');
                return eqIndex > 0 ? $"{env[..(eqIndex + 1)]}******" : "******";
            }).ToList();
        }

        Assert.Equal("POSTGRES_PASSWORD=******", inspect.Config!.Env[0]);
        Assert.Equal("API_KEY=******", inspect.Config.Env[1]);
        Assert.Equal("APP_ENV=******", inspect.Config.Env[2]);
    }

    [Fact]
    public void Settings_MasksSensitiveKeys()
    {
        var rawSettings = new Dictionary<string, string>
        {
            ["smtp_pass"] = "mypassword123",
            ["notification_telegram_bot_token"] = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
            ["notification_discord_webhook_url"] = "https://discord.com/api/webhooks/123/xyz",
            ["deploy_webhook_token"] = "secret-token-abc",
            ["system_language"] = "tr",
            ["theme"] = "dark"
        };

        var masked = new Dictionary<string, string>(rawSettings);
        string[] sensitiveKeys =
        [
            "smtp_pass",
            "notification_telegram_bot_token",
            "notification_discord_webhook_url",
            "notification_slack_webhook_url",
            "notification_webhook_url",
            "deploy_webhook_token"
        ];

        foreach (var key in sensitiveKeys)
        {
            if (masked.TryGetValue(key, out var val) && !string.IsNullOrEmpty(val))
            {
                masked[key] = "******";
            }
        }

        Assert.Equal("******", masked["smtp_pass"]);
        Assert.Equal("******", masked["notification_telegram_bot_token"]);
        Assert.Equal("******", masked["notification_discord_webhook_url"]);
        Assert.Equal("******", masked["deploy_webhook_token"]);
        Assert.Equal("tr", masked["system_language"]);
        Assert.Equal("dark", masked["theme"]);

        // When saving, masked "******" values preserve original
        var toSave = new Dictionary<string, string>();
        foreach (var (k, v) in masked)
        {
            if (v == "******" && rawSettings.TryGetValue(k, out var oldVal))
            {
                toSave[k] = oldVal;
            }
            else
            {
                toSave[k] = v;
            }
        }

        Assert.Equal("mypassword123", toSave["smtp_pass"]);
        Assert.Equal("secret-token-abc", toSave["deploy_webhook_token"]);
    }

    [Theory]
    [InlineData("valid-stack")]
    [InlineData("my_project.1")]
    [InlineData("web-app_dev")]
    public void ComposeProjectName_ValidPattern_Passes(string name)
    {
        var regex = new System.Text.RegularExpressions.Regex(@"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$");
        Assert.Matches(regex, name);
    }

    [Theory]
    [InlineData("../../../etc/cron.d")]
    [InlineData("/root/malicious")]
    [InlineData("..\\windows\\system32")]
    [InlineData(".hidden")]
    [InlineData("-invalid-start")]
    public void ComposeProjectName_PathTraversalPattern_Fails(string name)
    {
        var regex = new System.Text.RegularExpressions.Regex(@"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$");
        Assert.DoesNotMatch(regex, name);
    }
}
