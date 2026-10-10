using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Notifications;

public interface IWebhookChannelSender
{
    Task SendAsync(string webhookUrl, string eventType, string title, string message, CancellationToken ct = default);
}

public class WebhookChannelSender : IWebhookChannelSender
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookChannelSender> _logger;

    public WebhookChannelSender(IHttpClientFactory httpClientFactory, ILogger<WebhookChannelSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendAsync(string webhookUrl, string eventType, string title, string message, CancellationToken ct = default)
    {
        if (!NotificationSecurity.ValidateWebhookUrl(webhookUrl, isTr: false, out var err))
        {
            _logger.LogWarning("Generic webhook bildirim gönderimi engellendi: {Error}", err);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            string isoNow = DateTime.UtcNow.ToString("o");
            string json = $$"""
            {
              "event": {{JsonSerializer.Serialize(eventType, CorvusJsonSerializerContext.Default.String)}},
              "title": {{JsonSerializer.Serialize(title, CorvusJsonSerializerContext.Default.String)}},
              "message": {{JsonSerializer.Serialize(message, CorvusJsonSerializerContext.Default.String)}},
              "timestamp": "{{isoNow}}"
            }
            """;

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var res = await client.PostAsync(webhookUrl, content, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Generic webhook hata döndü: {StatusCode}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Generic webhook çağrısı başarısız oldu.");
        }
    }
}
