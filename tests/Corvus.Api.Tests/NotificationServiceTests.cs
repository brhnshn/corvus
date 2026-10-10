using System.Net;
using Corvus.Api.Data;
using Corvus.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Corvus.Api.Tests;

public class NotificationServiceTests
{
    private class FakeSettingsRepository : ISettingsRepository
    {
        private readonly Dictionary<string, string> _dict = new();

        public Task<Dictionary<string, string>> GetAllAsync() => Task.FromResult(new Dictionary<string, string>(_dict));
        public Task<string?> GetAsync(string key) => Task.FromResult(_dict.TryGetValue(key, out var v) ? v : null);
        public Task SetAsync(string key, string value)
        {
            _dict[key] = value;
            return Task.CompletedTask;
        }

        public Task SetBatchAsync(Dictionary<string, string> settings)
        {
            foreach (var (k, v) in settings)
            {
                _dict[k] = v;
            }
            return Task.CompletedTask;
        }
    }

    private class FakeHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
        {
            return new HttpClient();
        }
    }

    [Fact]
    public async Task TestChannelAsync_WithMissingDiscordUrl_ReturnsFailure()
    {
        var service = new NotificationService(new FakeSettingsRepository(), new FakeHttpClientFactory(), NullLogger<NotificationService>.Instance);

        var result = await service.TestChannelAsync("discord", webhookUrl: "", botToken: null, chatId: null);

        Assert.False(result.Success);
        Assert.Contains("Discord Webhook URL", result.Message);
    }

    [Fact]
    public async Task TestChannelAsync_WithMissingTelegramCredentials_ReturnsFailure()
    {
        var service = new NotificationService(new FakeSettingsRepository(), new FakeHttpClientFactory(), NullLogger<NotificationService>.Instance);

        var result = await service.TestChannelAsync("telegram", webhookUrl: null, botToken: "", chatId: "");

        Assert.False(result.Success);
        Assert.Contains("Telegram Bot Token", result.Message);
    }

    [Fact]
    public async Task TestChannelAsync_WithInvalidChannel_ReturnsFailure()
    {
        var service = new NotificationService(new FakeSettingsRepository(), new FakeHttpClientFactory(), NullLogger<NotificationService>.Instance);

        var result = await service.TestChannelAsync("unknown_channel", webhookUrl: null, botToken: null, chatId: null);

        Assert.False(result.Success);
        Assert.Contains("Unsupported notification channel", result.Message);
    }

    [Fact]
    public async Task TestChannelAsync_WithTurkishLanguage_ReturnsTurkishFailure()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("system_language", "tr");
        var service = new NotificationService(repo, new FakeHttpClientFactory(), NullLogger<NotificationService>.Instance);

        var result = await service.TestChannelAsync("unknown_channel", webhookUrl: null, botToken: null, chatId: null);

        Assert.False(result.Success);
        Assert.Contains("Desteklenmeyen bildirim kanalı", result.Message);
    }

    [Theory]
    [InlineData("http://127.0.0.1:8080/webhook")]
    [InlineData("http://localhost/webhook")]
    [InlineData("http://169.254.169.254/latest/meta-data")]
    [InlineData("http://169.254.170.2/v2/metadata")]
    [InlineData("http://[::1]:8080/webhook")]
    [InlineData("http://[::ffff:127.0.0.1]:8080/webhook")]
    [InlineData("ftp://evil.com/payload")]
    [InlineData("file:///etc/passwd")]
    public async Task TestChannelAsync_WithSsrfUrl_ReturnsFailure(string ssrfUrl)
    {
        var service = new NotificationService(new FakeSettingsRepository(), new FakeHttpClientFactory(), NullLogger<NotificationService>.Instance);

        var result = await service.TestChannelAsync("discord", webhookUrl: ssrfUrl, botToken: null, chatId: null);

        Assert.False(result.Success);
        Assert.True(result.Message.Contains("SSRF") || result.Message.Contains("protokol") || result.Message.Contains("protocol"));
    }

    private class RecordingHttpMessageHandler : HttpMessageHandler
    {
        public List<(HttpRequestMessage Request, string Body)> Requests { get; } = new();

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            string body = request.Content != null ? await request.Content.ReadAsStringAsync(cancellationToken) : string.Empty;
            Requests.Add((request, body));
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }

    private class MockHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;
        public MockHttpClientFactory(HttpMessageHandler handler) => _handler = handler;
        public HttpClient CreateClient(string name) => new HttpClient(_handler);
    }

    [Fact]
    public async Task DispatchSslExpiryAlertAsync_WhenDisabled_DoesNotSendAnyAlert()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("notify_ssl_expiry", "false");
        await repo.SetAsync("notification_discord_enabled", "true");
        await repo.SetAsync("notification_discord_webhook_url", "https://discord.com/api/webhooks/test1");

        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        await service.DispatchSslExpiryAlertAsync("Production API", "https://api.example.com", 5, "Let's Encrypt");

        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task DispatchSslExpiryAlertAsync_SendsCriticalAlert_WhenSevenDaysOrLess()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("system_language", "tr");
        await repo.SetAsync("notify_ssl_expiry", "true");
        await repo.SetAsync("notification_discord_enabled", "true");
        await repo.SetAsync("notification_discord_webhook_url", "https://discord.com/api/webhooks/test1");

        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        await service.DispatchSslExpiryAlertAsync("Auth Gateway", "https://auth.example.com", 6, "Let's Encrypt Authority");

        Assert.Single(handler.Requests);
        var (_, body) = handler.Requests[0];
        Assert.Contains("Auth Gateway", body);
        Assert.Contains("SSL", body);
        Assert.Contains("15548997", body); // Kırmızı embed rengi
    }

    [Fact]
    public async Task DispatchSslExpiryAlertAsync_SendsWarningAlert_WhenBetweenEightAndFourteenDays()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("system_language", "en");
        await repo.SetAsync("notify_ssl_expiry", "true");
        await repo.SetAsync("notification_discord_enabled", "true");
        await repo.SetAsync("notification_discord_webhook_url", "https://discord.com/api/webhooks/test1");

        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        await service.DispatchSslExpiryAlertAsync("Auth Gateway", "https://auth.example.com", 14, "DigiCert Global");

        Assert.Single(handler.Requests);
        var (_, body) = handler.Requests[0];
        Assert.Contains("[SSL RENEWAL ALERT] Auth Gateway", body);
        Assert.Contains("14 days", body);
        Assert.Contains("16098851", body); // Amber embed rengi
    }

    [Fact]
    public void ParseEmailRecipients_WithDelimitedStrings_ParsesCorrectly()
    {
        string input = "devops@example.com, admin@domain.org; alert@test.io \n oncall@corvus.dev";
        var result = NotificationService.ParseEmailRecipients(input);

        Assert.Equal(4, result.Count);
        Assert.Contains("devops@example.com", result);
        Assert.Contains("admin@domain.org", result);
        Assert.Contains("alert@test.io", result);
        Assert.Contains("oncall@corvus.dev", result);
    }

    [Fact]
    public void ParseEmailRecipients_WithJsonArray_ParsesAndDeduplicates()
    {
        string input = "[\"devops@example.com\", \"admin@domain.org\", \"DEVOPS@example.com\", \"not-an-email\"]";
        var result = NotificationService.ParseEmailRecipients(input);

        Assert.Equal(2, result.Count);
        Assert.Contains("devops@example.com", result);
        Assert.Contains("admin@domain.org", result);
    }

    [Fact]
    public void ParseEmailRecipients_WithEmptyOrInvalid_ReturnsEmptyList()
    {
        Assert.Empty(NotificationService.ParseEmailRecipients(null));
        Assert.Empty(NotificationService.ParseEmailRecipients(""));
        Assert.Empty(NotificationService.ParseEmailRecipients("   "));
        Assert.Empty(NotificationService.ParseEmailRecipients("invalid1 invalid2"));
    }

    [Fact]
    public async Task TestChannelAsync_WithMissingSlackUrl_ReturnsFailure()
    {
        var service = new NotificationService(new FakeSettingsRepository(), new FakeHttpClientFactory(), NullLogger<NotificationService>.Instance);

        var result = await service.TestChannelAsync("slack", webhookUrl: "", botToken: null, chatId: null);

        Assert.False(result.Success);
        Assert.Contains("Slack Webhook URL", result.Message);
    }

    [Fact]
    public async Task TestChannelAsync_WithValidSlackUrl_SendsFormattedSlackPayload()
    {
        var repo = new FakeSettingsRepository();
        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        var result = await service.TestChannelAsync("slack", webhookUrl: "https://hooks.slack.com/services/T00/B00/XXXX", botToken: null, chatId: null);

        Assert.True(result.Success);
        Assert.Single(handler.Requests);
        var (_, body) = handler.Requests[0];
        Assert.Contains("attachments", body);
        Assert.Contains("#22c55e", body);
        Assert.Contains("Corvus System Monitor", body);
    }

    [Fact]
    public async Task TestChannelAsync_WithMissingSmtpConfig_ReturnsFailure()
    {
        var service = new NotificationService(new FakeSettingsRepository(), new FakeHttpClientFactory(), NullLogger<NotificationService>.Instance);

        // Missing host
        var res1 = await service.TestChannelAsync("email", webhookUrl: null, botToken: null, chatId: null, smtpHost: "");
        Assert.False(res1.Success);
        Assert.Contains("SMTP Host", res1.Message);

        // Missing From
        var res2 = await service.TestChannelAsync("email", webhookUrl: null, botToken: null, chatId: null, smtpHost: "smtp.example.com", smtpFrom: "");
        Assert.False(res2.Success);
        Assert.Contains("From", res2.Message);

        // Missing To
        var res3 = await service.TestChannelAsync("email", webhookUrl: null, botToken: null, chatId: null, smtpHost: "smtp.example.com", smtpFrom: "noreply@example.com", smtpTo: "");
        Assert.False(res3.Success);
        Assert.Contains("To", res3.Message);
    }

    [Fact]
    public async Task DispatchFlappingAlertAsync_WhenDisabled_DoesNotSendAnyAlert()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("notify_flapping_events", "false");
        await repo.SetAsync("notification_slack_enabled", "true");
        await repo.SetAsync("notification_slack_webhook_url", "https://hooks.slack.com/services/T00/B00/XXXX");

        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        await service.DispatchFlappingAlertAsync("Redis Cache", "https://redis.local", isRecovered: false, transitionCount: 5);

        Assert.Empty(handler.Requests);
    }

    [Fact]
    public async Task DispatchFlappingAlertAsync_WhenFlappingDetected_SendsWarningAlert()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("system_language", "tr");
        await repo.SetAsync("notify_flapping_events", "true");
        await repo.SetAsync("notification_slack_enabled", "true");
        await repo.SetAsync("notification_slack_webhook_url", "https://hooks.slack.com/services/T00/B00/XXXX");

        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        await service.DispatchFlappingAlertAsync("Auth Gateway", "https://auth.example.com", isRecovered: false, transitionCount: 4);

        Assert.Single(handler.Requests);
        var (_, body) = handler.Requests[0];
        Assert.Contains("DALGALANMA", body);
        Assert.Contains("Auth Gateway", body);
        Assert.Contains("#f59e0b", body); // Amber warning color
    }

    [Fact]
    public async Task DispatchFlappingAlertAsync_WhenFlappingRecovered_SendsSuccessAlert()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("system_language", "en");
        await repo.SetAsync("notify_flapping_events", "true");
        await repo.SetAsync("notification_slack_enabled", "true");
        await repo.SetAsync("notification_slack_webhook_url", "https://hooks.slack.com/services/T00/B00/XXXX");

        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        await service.DispatchFlappingAlertAsync("Auth Gateway", "https://auth.example.com", isRecovered: true, transitionCount: 0);

        Assert.Single(handler.Requests);
        var (_, body) = handler.Requests[0];
        Assert.Contains("FLAPPING RESOLVED", body);
        Assert.Contains("stabilized across consecutive checks", body);
        Assert.Contains("#22c55e", body); // Green success color
    }

    [Fact]
    public async Task DispatchContainerCrashAlertAsync_WhenContainerExitedWithNonZero_SendsCrashAlert()
    {
        var repo = new FakeSettingsRepository();
        await repo.SetAsync("system_language", "en");
        await repo.SetAsync("notify_container_events", "true");
        await repo.SetAsync("notification_slack_enabled", "true");
        await repo.SetAsync("notification_slack_webhook_url", "https://hooks.slack.com/services/T00/B00/XXXX");

        var handler = new RecordingHttpMessageHandler();
        var service = new NotificationService(repo, new MockHttpClientFactory(handler), NullLogger<NotificationService>.Instance);

        await service.DispatchContainerCrashAlertAsync("api-worker-prod", "c1a2b3c4d5e6f7g8", exitCode: 137, errorReason: "OOMKilled");

        Assert.Single(handler.Requests);
        var (_, body) = handler.Requests[0];
        Assert.Contains("CONTAINER CRASH", body);
        Assert.Contains("api-worker-prod", body);
        Assert.Contains("137", body);
        Assert.Contains("OOMKilled", body);
        Assert.Contains("#ef4444", body); // Red error color
    }
}

