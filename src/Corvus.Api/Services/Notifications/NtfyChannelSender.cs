using System.Text;

namespace Corvus.Api.Services.Notifications;

public interface INtfyChannelSender
{
    Task SendAsync(string ntfyUrl, string title, string message, bool isDown, CancellationToken ct = default);
    Task SendAsync(string ntfyUrl, string title, string message, string priority, string tags, CancellationToken ct = default);
}

public class NtfyChannelSender : INtfyChannelSender
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NtfyChannelSender> _logger;

    public NtfyChannelSender(IHttpClientFactory httpClientFactory, ILogger<NtfyChannelSender> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public Task SendAsync(string ntfyUrl, string title, string message, bool isDown, CancellationToken ct = default) =>
        SendAsync(ntfyUrl, title, message, isDown ? "urgent" : "default", isDown ? "warning,skull" : "white_check_mark,sparkles", ct);

    public async Task SendAsync(string ntfyUrl, string title, string message, string priority, string tags, CancellationToken ct = default)
    {
        if (!NotificationSecurity.ValidateWebhookUrl(ntfyUrl, isTr: false, out var err))
        {
            _logger.LogWarning("Ntfy bildirim gönderimi engellendi: {Error}", err);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(8);

            using var req = new HttpRequestMessage(HttpMethod.Post, ntfyUrl);
            req.Headers.Add("Title", title);
            req.Headers.Add("Priority", priority);
            req.Headers.Add("Tags", tags);
            req.Content = new StringContent(message, Encoding.UTF8, "text/plain");

            var res = await client.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Ntfy bildirim isteği hata döndü: {StatusCode}", res.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ntfy bildirimi gönderilemedi.");
        }
    }
}
