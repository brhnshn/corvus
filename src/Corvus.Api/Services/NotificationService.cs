using Corvus.Api.Data;
using Corvus.Api.Models;
using Corvus.Api.Services.Notifications;
using Microsoft.Extensions.DependencyInjection;

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

public partial class NotificationService : INotificationService
{
    private readonly ISettingsRepository _settings;
    private readonly IDiscordChannelSender _discord;
    private readonly ITelegramChannelSender _telegram;
    private readonly INtfyChannelSender _ntfy;
    private readonly IWebhookChannelSender _webhook;
    private readonly ISlackChannelSender _slack;
    private readonly ISmtpChannelSender _smtp;
    private readonly ILogger<NotificationService> _logger;

    [ActivatorUtilitiesConstructor]
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
}
