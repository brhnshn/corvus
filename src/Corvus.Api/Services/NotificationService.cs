using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services.Notifications;

namespace Corvus.Api.Services;

public interface INotificationService
{
    Task DispatchServiceAlertAsync(string serviceName, string? url, bool isDown, string? errorMessage, CancellationToken ct = default);
    Task DispatchSslExpiryAlertAsync(string serviceName, string? url, int daysRemaining, string? issuer, CancellationToken ct = default);
    Task DispatchFlappingAlertAsync(string serviceName, string? url, bool isRecovered, int transitionCount, CancellationToken ct = default);
    Task DispatchContainerCrashAlertAsync(string containerName, string containerId, int exitCode, string? errorReason, CancellationToken ct = default);
    Task DispatchContainerAutoHealedAlertAsync(string containerName, string containerId, int exitCode, bool success, string? detailMessage, CancellationToken ct = default);
    Task DispatchMetricThresholdAlertAsync(string ruleName, string targetDescription, string metric, double thresholdValue, double currentValue, bool isResolved, CancellationToken ct = default);
    Task<NotificationResult> TestChannelAsync(
        string channel, 
        string? webhookUrl, 
        string? botToken, 
        string? chatId,
        string? smtpHost = null,
        int? smtpPort = null,
        string? smtpUser = null,
        string? smtpPass = null,
        string? smtpFrom = null,
        string? smtpFromName = null,
        string? smtpTo = null,
        bool? smtpTls = null,
        CancellationToken ct = default);
}

public class NotificationService : INotificationService
{
    private readonly ISettingsRepository _settings;
    private readonly IDiscordChannelSender _discord;
    private readonly ITelegramChannelSender _telegram;
    private readonly INtfyChannelSender _ntfy;
    private readonly IWebhookChannelSender _webhook;
    private readonly ISlackChannelSender _slack;
    private readonly ISmtpChannelSender _smtp;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        ISettingsRepository settings,
        IDiscordChannelSender discord,
        ITelegramChannelSender telegram,
        INtfyChannelSender ntfy,
        IWebhookChannelSender webhook,
        ISlackChannelSender slack,
        ISmtpChannelSender smtp,
        ILogger<NotificationService> logger)
    {
        _settings = settings;
        _discord = discord;
        _telegram = telegram;
        _ntfy = ntfy;
        _webhook = webhook;
        _slack = slack;
        _smtp = smtp;
        _logger = logger;
    }

    // Geriye dönük uyumluluk ve testler için kolaylık kurucusu (Convenience constructor)
    public NotificationService(
        ISettingsRepository settings,
        IHttpClientFactory httpClientFactory,
        ILogger<NotificationService> logger)
        : this(
            settings,
            new DiscordChannelSender(httpClientFactory, Microsoft.Extensions.Logging.Abstractions.NullLogger<DiscordChannelSender>.Instance),
            new TelegramChannelSender(httpClientFactory, Microsoft.Extensions.Logging.Abstractions.NullLogger<TelegramChannelSender>.Instance),
            new NtfyChannelSender(httpClientFactory, Microsoft.Extensions.Logging.Abstractions.NullLogger<NtfyChannelSender>.Instance),
            new WebhookChannelSender(httpClientFactory, Microsoft.Extensions.Logging.Abstractions.NullLogger<WebhookChannelSender>.Instance),
            new SlackChannelSender(httpClientFactory, Microsoft.Extensions.Logging.Abstractions.NullLogger<SlackChannelSender>.Instance),
            new SmtpChannelSender(Microsoft.Extensions.Logging.Abstractions.NullLogger<SmtpChannelSender>.Instance),
            logger)
    {
    }

    public static bool ValidateWebhookUrl(string? url, bool isTr, out string? errorMessage) =>
        NotificationSecurity.ValidateWebhookUrl(url, isTr, out errorMessage);

    public static List<string> ParseEmailRecipients(string? input) =>
        new SmtpChannelSender(Microsoft.Extensions.Logging.Abstractions.NullLogger<SmtpChannelSender>.Instance).ParseRecipients(input);

    public async Task DispatchServiceAlertAsync(string serviceName, string? url, bool isDown, string? errorMessage, CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        if (settings.TryGetValue("notify_service_events", out var nse) && nse == "false")
        {
            return;
        }

        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";
        var (title, message) = NotificationMessageFormatter.FormatServiceAlert(serviceName, url, isDown, errorMessage, isTr);

        var tasks = new List<Task>();

        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            tasks.Add(_discord.SendAsync(dUrl, title, message, isDown, ct));
        }

        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(_telegram.SendAsync(tToken, tChat, title, message, ct));
        }

        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(_ntfy.SendAsync(nUrl, title, message, isDown, ct));
        }

        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(_webhook.SendAsync(wUrl, isDown ? "service_down" : "service_up", title, message, ct));
        }

        if (settings.TryGetValue("notification_slack_enabled", out var slEnabled) && slEnabled == "true" &&
            settings.TryGetValue("notification_slack_webhook_url", out var slUrl) && !string.IsNullOrWhiteSpace(slUrl))
        {
            tasks.Add(_slack.SendAsync(slUrl, title, message, isDown ? "#ef4444" : "#22c55e", ct));
        }

        if (settings.TryGetValue("notification_email_enabled", out var eEnabled) && eEnabled == "true")
        {
            tasks.Add(_smtp.SendFromSettingsAsync(settings, title, message, isDown ? "#ef4444" : "#22c55e", ct));
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
            return;
        }

        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";
        var (title, message, isCritical) = NotificationMessageFormatter.FormatSslExpiryAlert(serviceName, url, daysRemaining, issuer, isTr);

        var tasks = new List<Task>();

        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            int color = isCritical ? 15548997 : 16098851;
            tasks.Add(_discord.SendAsync(dUrl, title, message, color, ct));
        }

        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(_telegram.SendAsync(tToken, tChat, title, message, ct));
        }

        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(_ntfy.SendAsync(nUrl, title, message, priority: isCritical ? "urgent" : "high", tags: isCritical ? "warning,lock" : "lock", ct));
        }

        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(_webhook.SendAsync(wUrl, "ssl_expiry", title, message, ct));
        }

        if (settings.TryGetValue("notification_slack_enabled", out var slEnabled) && slEnabled == "true" &&
            settings.TryGetValue("notification_slack_webhook_url", out var slUrl) && !string.IsNullOrWhiteSpace(slUrl))
        {
            tasks.Add(_slack.SendAsync(slUrl, title, message, isCritical ? "#ef4444" : "#f59e0b", ct));
        }

        if (settings.TryGetValue("notification_email_enabled", out var eEnabled) && eEnabled == "true")
        {
            tasks.Add(_smtp.SendFromSettingsAsync(settings, title, message, isCritical ? "#ef4444" : "#f59e0b", ct));
        }

        if (tasks.Count > 0)
        {
            await Task.WhenAll(tasks);
        }
    }

    public async Task DispatchFlappingAlertAsync(string serviceName, string? url, bool isRecovered, int transitionCount, CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        if (settings.TryGetValue("notify_flapping_events", out var nfe) && nfe == "false")
        {
            return;
        }

        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";
        var (title, message, badgeColor, discordColor) = NotificationMessageFormatter.FormatFlappingAlert(serviceName, url, isRecovered, transitionCount, isTr);

        var tasks = new List<Task>();

        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            tasks.Add(_discord.SendAsync(dUrl, title, message, discordColor, ct));
        }

        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(_telegram.SendAsync(tToken, tChat, title, message, ct));
        }

        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(_ntfy.SendAsync(nUrl, title, message, isDown: !isRecovered, ct));
        }

        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(_webhook.SendAsync(wUrl, isRecovered ? "flapping_resolved" : "flapping_detected", title, message, ct));
        }

        if (settings.TryGetValue("notification_slack_enabled", out var slEnabled) && slEnabled == "true" &&
            settings.TryGetValue("notification_slack_webhook_url", out var slUrl) && !string.IsNullOrWhiteSpace(slUrl))
        {
            tasks.Add(_slack.SendAsync(slUrl, title, message, badgeColor, ct));
        }

        if (settings.TryGetValue("notification_email_enabled", out var eEnabled) && eEnabled == "true")
        {
            tasks.Add(_smtp.SendFromSettingsAsync(settings, title, message, badgeColor, ct));
        }

        if (tasks.Count > 0)
        {
            await Task.WhenAll(tasks);
        }
    }

    public async Task DispatchContainerCrashAlertAsync(string containerName, string containerId, int exitCode, string? errorReason, CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        if (settings.TryGetValue("notify_container_events", out var nce) && nce == "false")
        {
            return;
        }

        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";
        var (title, message) = NotificationMessageFormatter.FormatContainerCrashAlert(containerName, containerId, exitCode, errorReason, isTr);

        const string badgeColor = "#ef4444";
        const int discordColor = 15548997;

        var tasks = new List<Task>();

        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            tasks.Add(_discord.SendAsync(dUrl, title, message, discordColor, ct));
        }

        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(_telegram.SendAsync(tToken, tChat, title, message, ct));
        }

        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(_ntfy.SendAsync(nUrl, title, message, priority: "urgent", tags: "skull,warning", ct));
        }

        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(_webhook.SendAsync(wUrl, "container_crash", title, message, ct));
        }

        if (settings.TryGetValue("notification_slack_enabled", out var slEnabled) && slEnabled == "true" &&
            settings.TryGetValue("notification_slack_webhook_url", out var slUrl) && !string.IsNullOrWhiteSpace(slUrl))
        {
            tasks.Add(_slack.SendAsync(slUrl, title, message, badgeColor, ct));
        }

        if (settings.TryGetValue("notification_email_enabled", out var eEnabled) && eEnabled == "true")
        {
            tasks.Add(_smtp.SendFromSettingsAsync(settings, title, message, badgeColor, ct));
        }

        if (tasks.Count > 0)
        {
            await Task.WhenAll(tasks);
        }
    }

    public async Task DispatchContainerAutoHealedAlertAsync(string containerName, string containerId, int exitCode, bool success, string? detailMessage, CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        if (settings.TryGetValue("notify_container_events", out var nce) && nce == "false")
        {
            return;
        }

        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";
        var (title, message, badgeColor, discordColor) = NotificationMessageFormatter.FormatContainerAutoHealedAlert(containerName, containerId, exitCode, success, detailMessage, isTr);

        var tasks = new List<Task>();

        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            tasks.Add(_discord.SendAsync(dUrl, title, message, discordColor, ct));
        }

        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(_telegram.SendAsync(tToken, tChat, title, message, ct));
        }

        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(_ntfy.SendAsync(nUrl, title, message, priority: success ? "default" : "high", tags: success ? "sparkles,white_check_mark" : "warning", ct));
        }

        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(_webhook.SendAsync(wUrl, success ? "container_auto_healed" : "container_crash_loop", title, message, ct));
        }

        if (settings.TryGetValue("notification_slack_enabled", out var slEnabled) && slEnabled == "true" &&
            settings.TryGetValue("notification_slack_webhook_url", out var slUrl) && !string.IsNullOrWhiteSpace(slUrl))
        {
            tasks.Add(_slack.SendAsync(slUrl, title, message, badgeColor, ct));
        }

        if (settings.TryGetValue("notification_email_enabled", out var eEnabled) && eEnabled == "true")
        {
            tasks.Add(_smtp.SendFromSettingsAsync(settings, title, message, badgeColor, ct));
        }

        if (tasks.Count > 0)
        {
            await Task.WhenAll(tasks);
        }
    }

    public async Task DispatchMetricThresholdAlertAsync(
        string ruleName, 
        string targetDescription, 
        string metric, 
        double thresholdValue, 
        double currentValue, 
        bool isResolved, 
        CancellationToken ct = default)
    {
        var settings = await _settings.GetAllAsync();
        bool isTr = settings.TryGetValue("system_language", out var lang) && lang?.ToLowerInvariant() == "tr";
        var (title, message, badgeColor, discordColor) = NotificationMessageFormatter.FormatMetricThresholdAlert(
            ruleName, targetDescription, metric, thresholdValue, currentValue, isResolved, isTr);

        var tasks = new List<Task>();

        if (settings.TryGetValue("notification_discord_enabled", out var dEnabled) && dEnabled == "true" &&
            settings.TryGetValue("notification_discord_webhook_url", out var dUrl) && !string.IsNullOrWhiteSpace(dUrl))
        {
            tasks.Add(_discord.SendAsync(dUrl, title, message, discordColor, ct));
        }

        if (settings.TryGetValue("notification_telegram_enabled", out var tEnabled) && tEnabled == "true" &&
            settings.TryGetValue("notification_telegram_bot_token", out var tToken) && !string.IsNullOrWhiteSpace(tToken) &&
            settings.TryGetValue("notification_telegram_chat_id", out var tChat) && !string.IsNullOrWhiteSpace(tChat))
        {
            tasks.Add(_telegram.SendAsync(tToken, tChat, title, message, ct));
        }

        if (settings.TryGetValue("notification_ntfy_enabled", out var nEnabled) && nEnabled == "true" &&
            settings.TryGetValue("notification_ntfy_url", out var nUrl) && !string.IsNullOrWhiteSpace(nUrl))
        {
            tasks.Add(_ntfy.SendAsync(nUrl, title, message, priority: isResolved ? "default" : "urgent", tags: isResolved ? "white_check_mark" : "fire,warning", ct));
        }

        if (settings.TryGetValue("notification_webhook_enabled", out var wEnabled) && wEnabled == "true" &&
            settings.TryGetValue("notification_webhook_url", out var wUrl) && !string.IsNullOrWhiteSpace(wUrl))
        {
            tasks.Add(_webhook.SendAsync(wUrl, isResolved ? "metric_resolved" : "metric_threshold_exceeded", title, message, ct));
        }

        if (settings.TryGetValue("notification_slack_enabled", out var slEnabled) && slEnabled == "true" &&
            settings.TryGetValue("notification_slack_webhook_url", out var slUrl) && !string.IsNullOrWhiteSpace(slUrl))
        {
            tasks.Add(_slack.SendAsync(slUrl, title, message, badgeColor, ct));
        }

        if (settings.TryGetValue("notification_email_enabled", out var eEnabled) && eEnabled == "true")
        {
            tasks.Add(_smtp.SendFromSettingsAsync(settings, title, message, badgeColor, ct));
        }

        if (tasks.Count > 0)
        {
            await Task.WhenAll(tasks);
        }
    }

    public async Task<NotificationResult> TestChannelAsync(
        string channel, 
        string? webhookUrl, 
        string? botToken, 
        string? chatId,
        string? smtpHost = null,
        int? smtpPort = null,
        string? smtpUser = null,
        string? smtpPass = null,
        string? smtpFrom = null,
        string? smtpFromName = null,
        string? smtpTo = null,
        bool? smtpTls = null,
        CancellationToken ct = default)
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
                    await _discord.SendAsync(webhookUrl!, title, message, isDown: false, ct);
                    return new NotificationResult(true, isTr ? "Discord test bildirimi başarıyla gönderildi." : "Discord test notification sent successfully.");

                case "slack":
                    if (string.IsNullOrWhiteSpace(webhookUrl))
                        return new NotificationResult(false, isTr ? "Slack Webhook URL boş olamaz." : "Slack Webhook URL cannot be empty.");
                    if (!ValidateWebhookUrl(webhookUrl, isTr, out var slackErr))
                        return new NotificationResult(false, slackErr!);
                    await _slack.SendAsync(webhookUrl!, title, message, "#22c55e", ct);
                    return new NotificationResult(true, isTr ? "Slack test bildirimi başarıyla gönderildi." : "Slack test notification sent successfully.");

                case "telegram":
                    if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId))
                        return new NotificationResult(false, isTr ? "Telegram Bot Token ve Chat ID boş olamaz." : "Telegram Bot Token and Chat ID cannot be empty.");
                    await _telegram.SendAsync(botToken, chatId, title, message, ct);
                    return new NotificationResult(true, isTr ? "Telegram test bildirimi başarıyla gönderildi." : "Telegram test notification sent successfully.");

                case "ntfy":
                    if (string.IsNullOrWhiteSpace(webhookUrl))
                        return new NotificationResult(false, isTr ? "Ntfy URL / Topic boş olamaz." : "Ntfy URL / Topic cannot be empty.");
                    if (!ValidateWebhookUrl(webhookUrl, isTr, out var ntfyErr))
                        return new NotificationResult(false, ntfyErr!);
                    await _ntfy.SendAsync(webhookUrl!, title, message, isDown: false, ct);
                    return new NotificationResult(true, isTr ? "Ntfy test bildirimi başarıyla gönderildi." : "Ntfy test notification sent successfully.");

                case "webhook":
                    if (string.IsNullOrWhiteSpace(webhookUrl))
                        return new NotificationResult(false, isTr ? "Webhook URL boş olamaz." : "Webhook URL cannot be empty.");
                    if (!ValidateWebhookUrl(webhookUrl, isTr, out var hookErr))
                        return new NotificationResult(false, hookErr!);
                    await _webhook.SendAsync(webhookUrl!, "test", title, message, ct);
                    return new NotificationResult(true, isTr ? "Generic Webhook test çağrısı başarıyla yapıldı." : "Generic Webhook test call executed successfully.");

                case "email":
                case "smtp":
                    string host = !string.IsNullOrWhiteSpace(smtpHost) ? smtpHost : settings.GetValueOrDefault("smtp_host", "");
                    int port = smtpPort ?? (int.TryParse(settings.GetValueOrDefault("smtp_port", "587"), out var p) ? p : 587);
                    string user = smtpUser ?? settings.GetValueOrDefault("smtp_user", "");
                    string pass = smtpPass ?? settings.GetValueOrDefault("smtp_pass", "");
                    string from = !string.IsNullOrWhiteSpace(smtpFrom) ? smtpFrom : settings.GetValueOrDefault("smtp_from", "");
                    string fromName = smtpFromName ?? settings.GetValueOrDefault("smtp_from_name", "Corvus Monitor");
                    string to = !string.IsNullOrWhiteSpace(smtpTo) ? smtpTo : settings.GetValueOrDefault("smtp_to", "");
                    bool enableSsl = smtpTls ?? (settings.GetValueOrDefault("smtp_tls", "true") == "true");

                    if (string.IsNullOrWhiteSpace(host))
                        return new NotificationResult(false, isTr ? "SMTP Sunucusu (Host) boş olamaz." : "SMTP Host cannot be empty.");
                    if (string.IsNullOrWhiteSpace(from))
                        return new NotificationResult(false, isTr ? "Gönderen E-Posta adresi (From) boş olamaz." : "Sender Email (From) cannot be empty.");
                    if (string.IsNullOrWhiteSpace(to))
                        return new NotificationResult(false, isTr ? "En az bir alıcı e-posta adresi (To) belirtilmelidir." : "At least one recipient email (To) must be specified.");

                    var recipientList = _smtp.ParseRecipients(to);
                    if (recipientList.Count == 0)
                        return new NotificationResult(false, isTr ? "Geçerli bir alıcı e-posta adresi bulunamadı." : "No valid recipient email address found.");

                    await _smtp.SendAsync(host, port, enableSsl, user, pass, from, fromName, recipientList, title, message, "#22c55e", ct);
                    return new NotificationResult(true, isTr ? $"Test e-postası başarıyla gönderildi ({recipientList.Count} alıcı)." : $"Test email sent successfully ({recipientList.Count} recipients).");

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
}
