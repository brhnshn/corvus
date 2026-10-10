using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Notifications;

public interface ISlackChannelSender
{
    Task SendAsync(string webhookUrl, string title, string message, string color, CancellationToken ct = default);
}

public class SlackChannelSender : ISlackChannelSender
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SlackChannelSender> _logger;

    public SlackChannelSender(IHttpClientFactory httpClientFactory, ILogger<SlackChannelSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendAsync(string webhookUrl, string title, string message, string color, CancellationToken ct = default)
    {
        if (!NotificationSecurity.ValidateWebhookUrl(webhookUrl, isTr: false, out var err))
        {
            _logger.LogWarning("Slack bildirim gönderimi engellendi: {Error}", err);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            long unixNow = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            string json = $$"""
            {
              "text": {{JsonSerializer.Serialize(title, CorvusJsonSerializerContext.Default.String)}},
              "attachments": [
                {
                  "color": {{JsonSerializer.Serialize(color, CorvusJsonSerializerContext.Default.String)}},
                  "title": {{JsonSerializer.Serialize(title, CorvusJsonSerializerContext.Default.String)}},
                  "text": {{JsonSerializer.Serialize(message, CorvusJsonSerializerContext.Default.String)}},
                  "footer": "Corvus System Monitor",
                  "ts": {{unixNow}}
                }
              ]
            }
            """;

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var res = await client.PostAsync(webhookUrl, content, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Slack webhook hata döndü: {StatusCode}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Slack webhook gönderilemedi.");
        }
    }
}
