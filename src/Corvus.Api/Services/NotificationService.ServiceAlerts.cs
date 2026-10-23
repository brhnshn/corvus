using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services.Notifications;
using Microsoft.Extensions.DependencyInjection;

namespace Corvus.Api.Services;

// Servis erişilebilirlik, SSL sertifika bitişi ve dalgalanma (flapping) bildirimleri
public partial class NotificationService
{
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
}
