using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Notifications;

public interface IDiscordChannelSender
{
    Task SendAsync(string webhookUrl, string title, string message, bool isDown, CancellationToken ct = default);
    Task SendAsync(string webhookUrl, string title, string message, int color, CancellationToken ct = default);
}

public class DiscordChannelSender : IDiscordChannelSender
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DiscordChannelSender> _logger;

    public DiscordChannelSender(IHttpClientFactory httpClientFactory, ILogger<DiscordChannelSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public Task SendAsync(string webhookUrl, string title, string message, bool isDown, CancellationToken ct = default) =>
        SendAsync(webhookUrl, title, message, isDown ? 15548997 : 5763719, ct);

    public async Task SendAsync(string webhookUrl, string title, string message, int color, CancellationToken ct = default)
    {
        if (!NotificationSecurity.ValidateWebhookUrl(webhookUrl, isTr: false, out var err))
        {
            _logger.LogWarning("Discord bildirim gönderimi engellendi: {Error}", err);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            string isoNow = DateTime.UtcNow.ToString("o");

            string json = $$"""
            {
              "username": "Corvus Monitor",
              "embeds": [
                {
                  "title": {{JsonSerializer.Serialize(title, CorvusJsonSerializerContext.Default.String)}},
                  "description": {{JsonSerializer.Serialize(message, CorvusJsonSerializerContext.Default.String)}},
                  "color": {{color}},
                  "timestamp": "{{isoNow}}"
                }
              ]
            }
            """;

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var res = await client.PostAsync(webhookUrl, content, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Discord webhook hata döndü: {StatusCode}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Discord webhook gönderilemedi.");
        }
    }
}
