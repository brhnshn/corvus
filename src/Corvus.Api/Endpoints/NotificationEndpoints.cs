using Corvus.Api.Models;
using Corvus.Api.Services;

namespace Corvus.Api.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications")
            .AddEndpointFilter<CorvusAuthFilter>();

        group.MapPost("/test", async (TestNotificationRequest req, INotificationService notifService, CancellationToken ct) =>
        {
            var result = await notifService.TestChannelAsync(
                req.Channel, 
                req.WebhookUrl, 
                req.BotToken, 
                req.ChatId,
                req.SmtpHost,
                req.SmtpPort,
                req.SmtpUser,
                req.SmtpPass,
                req.SmtpFrom,
                req.SmtpFromName,
                req.SmtpTo,
                req.SmtpTls,
                ct);

            return result.Success 
                ? Results.Ok(result) 
                : Results.BadRequest(result);
        });
    }
}
