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
}
