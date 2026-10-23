using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services.Notifications;
using Microsoft.Extensions.DependencyInjection;

namespace Corvus.Api.Services;

// Metrik eşik alarmları ve kanal test gönderimi
public partial class NotificationService
{
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
            _logger.LogError(ex, "{Channel} test bildirimi başarısız oldu.", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(channel));
            return new NotificationResult(false, $"Bildirim gönderilemedi: {ex.Message}");
        }
    }
}
