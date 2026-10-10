using System.Net;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Notifications;

public interface ITelegramChannelSender
{
    Task SendAsync(string botToken, string chatId, string title, string message, CancellationToken ct = default);
}

public class TelegramChannelSender : ITelegramChannelSender
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TelegramChannelSender> _logger;

    public TelegramChannelSender(IHttpClientFactory httpClientFactory, ILogger<TelegramChannelSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendAsync(string botToken, string chatId, string title, string message, CancellationToken ct = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            string safeTitle = WebUtility.HtmlEncode(title);
            string safeMessage = WebUtility.HtmlEncode(message);
            string fullText = $"<b>{safeTitle}</b>\n\n{safeMessage}";
            string url = $"https://api.telegram.org/bot{Uri.EscapeDataString(botToken)}/sendMessage";

            string json = $$"""
            {
              "chat_id": {{JsonSerializer.Serialize(chatId, CorvusJsonSerializerContext.Default.String)}},
              "text": {{JsonSerializer.Serialize(fullText, CorvusJsonSerializerContext.Default.String)}},
              "parse_mode": "HTML"
            }
            """;

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var res = await client.PostAsync(url, content, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Telegram bot API hata döndü: {StatusCode}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Telegram bildirimi gönderilemedi.");
        }
    }
}
