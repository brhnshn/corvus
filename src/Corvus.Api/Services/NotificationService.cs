using System.Net;
using System.Text;
using System.Text.Json;
using Corvus.Api.Data;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface INotificationService
{
    Task DispatchServiceAlertAsync(string serviceName, string? url, bool isDown, string? errorMessage, CancellationToken ct = default);
    Task DispatchSslExpiryAlertAsync(string serviceName, string? url, int daysRemaining, string? issuer, CancellationToken ct = default);
    Task<NotificationResult> TestChannelAsync(string channel, string? webhookUrl, string? botToken, string? chatId, CancellationToken ct = default);
}

public class NotificationService : INotificationService
{
    private readonly ISettingsRepository _settings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        ISettingsRepository settings,
        IHttpClientFactory httpClientFactory,
        ILogger<NotificationService> logger)
    {
        _settings = settings;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task DispatchServiceAlertAsync(string serviceName, string? url, bool isDown, string? errorMessage, CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        if (settings.TryGetValue("notify_service_events", out var nse) && nse == "false")
        {
            return; // Servis kesintisi bildirimleri devre dışı bırakılmış
        }

        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";

        string title = isDown 
            ? (isTr ? $"[SERVİS KESİNTİSİ] {serviceName}" : $"[SERVICE OUTAGE] {serviceName}")
            : (isTr ? $"[SERVİS KURTARILDI] {serviceName}" : $"[SERVICE RECOVERED] {serviceName}");

        string message = isDown
            ? (isTr
                ? $"Servis erişilemez durumda!\nURL: {url ?? "Belirtilmedi"}\nHata: {errorMessage ?? "Bilinmiyor"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Service is unreachable!\nURL: {url ?? "Not specified"}\nError: {errorMessage ?? "Unknown"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC")
            : (isTr
                ? $"Servis tekrar sağlıklı şekilde yanıt veriyor.\nURL: {url ?? "Belirtilmedi"}\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
                : $"Service is responding healthy again.\nURL: {url ?? "Not specified"}\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC");

        var tasks = new List<Task>();

        // Discord
        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            tasks.Add(SendDiscordAsync(dUrl, title, message, isDown, ct));
        }

        // Telegram
        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(SendTelegramAsync(tToken, tChat, title, message, ct));
        }

        // Ntfy
        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(SendNtfyAsync(nUrl, title, message, isDown, ct));
        }

        // Generic Webhook
        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(SendGenericWebhookAsync(wUrl, isDown ? "service_down" : "service_up", title, message, ct));
        }

        if (tasks.Count > 0)
        {
            await Task.WhenAll(tasks);
        }
    }

    public async Task DispatchSslExpiryAlertAsync(string serviceName, string? url, int daysRemaining, string? issuer, CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        if (settings.TryGetValue("notify_ssl_expiry", out var nse) && nse == "false")
        {
            return; // SSL sertifika bildirimleri devre dışı bırakılmış
        }

        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";
        bool isCritical = daysRemaining <= 7;

        string title = isCritical
            ? (isTr ? $"[KRİTİK SSL UYARISI] {serviceName}" : $"[CRITICAL SSL ALERT] {serviceName}")
            : (isTr ? $"[SSL YENİLEME UYARISI] {serviceName}" : $"[SSL RENEWAL ALERT] {serviceName}");

        string message = isTr
            ? $"SSL sertifikasının bitmesine {daysRemaining} gün kaldı!\nServis: {serviceName}\nURL: {url ?? "Belirtilmedi"}\nSağlayıcı: {issuer ?? "Bilinmiyor"}\nLütfen sertifikanızı en kısa sürede yenileyin.\nZaman: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC"
            : $"SSL certificate will expire in {daysRemaining} days!\nService: {serviceName}\nURL: {url ?? "Not specified"}\nIssuer: {issuer ?? "Unknown"}\nPlease renew your certificate soon.\nTime: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC";

        var tasks = new List<Task>();

        // Discord (Amber for 14d warning, Red for <= 7d critical)
        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            int color = isCritical ? 15548997 : 16098851; // #ED4245 (Red) or #F59E0B (Amber)
            tasks.Add(SendDiscordAsync(dUrl, title, message, color, ct));
        }

        // Telegram
        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(SendTelegramAsync(tToken, tChat, title, message, ct));
        }

        // Ntfy
        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(SendNtfyAsync(nUrl, title, message, priority: isCritical ? "urgent" : "high", tags: isCritical ? "warning,lock" : "lock", ct));
        }

        // Generic Webhook
        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(SendGenericWebhookAsync(wUrl, "ssl_expiry", title, message, ct));
        }

        if (tasks.Count > 0)
        {
            await Task.WhenAll(tasks);
        }
    }

    public static bool ValidateWebhookUrl(string? url, bool isTr, out string? errorMessage)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            errorMessage = isTr ? "Webhook URL boş olamaz." : "Webhook URL cannot be empty.";
            return false;
        }

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || 
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            errorMessage = isTr ? "Geçersiz URL veya desteklenmeyen protokol (yalnızca HTTP/HTTPS desteklenir)." : "Invalid URL or unsupported protocol (only HTTP/HTTPS supported).";
            return false;
        }

        string host = uri.DnsSafeHost.Trim('[', ']').ToLowerInvariant();
        if (host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "0.0.0.0" || host == "::" ||
            host == "169.254.169.254" || host == "metadata.google.internal")
        {
            errorMessage = isTr 
                ? "Güvenlik uyarısı: Hedef URL yerel veya bulut metadata adresine işaret ediyor (SSRF Koruması)." 
                : "Security warning: Target URL points to local or cloud metadata address (SSRF Protection).";
            return false;
        }

        if (IPAddress.TryParse(host, out var ip))
        {
            if (ip.IsIPv4MappedToIPv6)
            {
                ip = ip.MapToIPv4();
            }

            bool isLinkLocalV4 = ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork &&
                                 ip.GetAddressBytes()[0] == 169 && ip.GetAddressBytes()[1] == 254;

            if (IPAddress.IsLoopback(ip) || 
                ip.Equals(IPAddress.Any) || 
                ip.Equals(IPAddress.IPv6Any) || 
                ip.IsIPv6LinkLocal || 
                ip.IsIPv6SiteLocal ||
                isLinkLocalV4)
            {
                errorMessage = isTr 
                    ? "Güvenlik uyarısı: Hedef URL yerel veya bulut metadata adresine işaret ediyor (SSRF Koruması)." 
                    : "Security warning: Target URL points to local or cloud metadata address (SSRF Protection).";
                return false;
            }
        }

        errorMessage = null;
        return true;
    }

    public async Task<NotificationResult> TestChannelAsync(string channel, string? webhookUrl, string? botToken, string? chatId, CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";

        string title = isTr ? "Corvus Test Bildirimi" : "Corvus Test Notification";
        string message = isTr 
            ? "Bu bildirim Corvus System Monitor tarafından başarıyla gönderildi. Bildirim entegrasyonunuz aktif ve çalışıyor!"
            : "This notification was successfully sent by Corvus System Monitor. Your notification integration is active and working!";

        try
        {
            switch (channel.ToLowerInvariant())
            {
                case "discord":
                    if (string.IsNullOrWhiteSpace(webhookUrl))
                        return new NotificationResult(false, isTr ? "Discord Webhook URL boş olamaz." : "Discord Webhook URL cannot be empty.");
                    if (!ValidateWebhookUrl(webhookUrl, isTr, out var discordErr))
                        return new NotificationResult(false, discordErr!);
                    await SendDiscordAsync(webhookUrl!, title, message, isDown: false, ct);
                    return new NotificationResult(true, isTr ? "Discord test bildirimi başarıyla gönderildi." : "Discord test notification sent successfully.");

                case "telegram":
                    if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId))
                        return new NotificationResult(false, isTr ? "Telegram Bot Token ve Chat ID boş olamaz." : "Telegram Bot Token and Chat ID cannot be empty.");
                    await SendTelegramAsync(botToken, chatId, title, message, ct);
                    return new NotificationResult(true, isTr ? "Telegram test bildirimi başarıyla gönderildi." : "Telegram test notification sent successfully.");

                case "ntfy":
                    if (string.IsNullOrWhiteSpace(webhookUrl))
                        return new NotificationResult(false, isTr ? "Ntfy URL / Topic boş olamaz." : "Ntfy URL / Topic cannot be empty.");
                    if (!ValidateWebhookUrl(webhookUrl, isTr, out var ntfyErr))
                        return new NotificationResult(false, ntfyErr!);
                    await SendNtfyAsync(webhookUrl!, title, message, isDown: false, ct);
                    return new NotificationResult(true, isTr ? "Ntfy test bildirimi başarıyla gönderildi." : "Ntfy test notification sent successfully.");

                case "webhook":
                    if (string.IsNullOrWhiteSpace(webhookUrl))
                        return new NotificationResult(false, isTr ? "Webhook URL boş olamaz." : "Webhook URL cannot be empty.");
                    if (!ValidateWebhookUrl(webhookUrl, isTr, out var hookErr))
                        return new NotificationResult(false, hookErr!);
                    await SendGenericWebhookAsync(webhookUrl!, "test", title, message, ct);
                    return new NotificationResult(true, isTr ? "Generic Webhook test çağrısı başarıyla yapıldı." : "Generic Webhook test call executed successfully.");

                default:
                    return new NotificationResult(false, isTr ? $"Desteklenmeyen bildirim kanalı: {channel}" : $"Unsupported notification channel: {channel}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{Channel} test bildirimi başarısız oldu.", channel);
            return new NotificationResult(false, $"Bildirim gönderilemedi: {ex.Message}");
        }
    }

    private Task SendDiscordAsync(string webhookUrl, string title, string message, bool isDown, CancellationToken ct) =>
        SendDiscordAsync(webhookUrl, title, message, isDown ? 15548997 : 5763719, ct);

    private async Task SendDiscordAsync(string webhookUrl, string title, string message, int color, CancellationToken ct)
    {
        if (!ValidateWebhookUrl(webhookUrl, isTr: false, out var err))
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

    private async Task SendTelegramAsync(string botToken, string chatId, string title, string message, CancellationToken ct)
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

    private Task SendNtfyAsync(string ntfyUrl, string title, string message, bool isDown, CancellationToken ct) =>
        SendNtfyAsync(ntfyUrl, title, message, isDown ? "urgent" : "default", isDown ? "warning,skull" : "white_check_mark,sparkles", ct);

    private async Task SendNtfyAsync(string ntfyUrl, string title, string message, string priority, string tags, CancellationToken ct)
    {
        if (!ValidateWebhookUrl(ntfyUrl, isTr: false, out var err))
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

    private async Task SendGenericWebhookAsync(string webhookUrl, string eventType, string title, string message, CancellationToken ct)
    {
        if (!ValidateWebhookUrl(webhookUrl, isTr: false, out var err))
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
