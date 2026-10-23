using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services.Notifications;
using Microsoft.Extensions.DependencyInjection;

namespace Corvus.Api.Services;

// Konteyner çökme ve otomatik kurtarma (auto-healing) bildirimleri
public partial class NotificationService
{
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
}
