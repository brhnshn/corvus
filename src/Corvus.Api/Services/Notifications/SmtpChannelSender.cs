using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Corvus.Api.Models;

namespace Corvus.Api.Services.Notifications;

public interface ISmtpChannelSender
{
    Task SendFromSettingsAsync(Dictionary<string, string> settings, string title, string message, string badgeColor, CancellationToken ct = default);
    Task SendAsync(string host, int port, bool enableSsl, string? user, string? pass, string fromEmail, string? fromName, List<string> toEmails, string subject, string bodyMessage, string badgeColor, CancellationToken ct = default);
    List<string> ParseRecipients(string? input);
}

public class SmtpChannelSender : ISmtpChannelSender
{
    private readonly ILogger<SmtpChannelSender> _logger;

    public SmtpChannelSender(ILogger<SmtpChannelSender> logger)
    {
        _logger = logger;
    }

    public async Task SendFromSettingsAsync(Dictionary<string, string> settings, string title, string message, string badgeColor, CancellationToken ct = default)
    {
        try
        {
            string host = settings.GetValueOrDefault("smtp_host", "");
            if (string.IsNullOrWhiteSpace(host)) return;

            int port = int.TryParse(settings.GetValueOrDefault("smtp_port", "587"), out var p) ? p : 587;
            string user = settings.GetValueOrDefault("smtp_user", "");
            string pass = settings.GetValueOrDefault("smtp_pass", "");
            string from = settings.GetValueOrDefault("smtp_from", "");
            if (string.IsNullOrWhiteSpace(from)) return;

            string fromName = settings.GetValueOrDefault("smtp_from_name", "Corvus Monitor");
            string to = settings.GetValueOrDefault("smtp_to", "");
            if (string.IsNullOrWhiteSpace(to)) return;

            bool enableSsl = settings.GetValueOrDefault("smtp_tls", "true") == "true";

            var recipientList = ParseRecipients(to);
            if (recipientList.Count == 0) return;

            await SendAsync(host, port, enableSsl, user, pass, from, fromName, recipientList, title, message, badgeColor, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ayarlardan SMTP e-posta gönderimi başarısız.");
        }
    }

    public async Task SendAsync(
        string host,
        int port,
        bool enableSsl,
        string? user,
        string? pass,
        string fromEmail,
        string? fromName,
        List<string> toEmails,
        string subject,
        string bodyMessage,
        string badgeColor,
        CancellationToken ct = default)
    {
        try
        {
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Timeout = 12000
            };

            if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
            {
                client.Credentials = new NetworkCredential(user, pass);
            }

            var fromAddress = !string.IsNullOrWhiteSpace(fromName)
                ? new MailAddress(fromEmail, fromName, Encoding.UTF8)
                : new MailAddress(fromEmail);

            string htmlBody = BuildEmailHtml(subject, bodyMessage, badgeColor);

            using var mail = new MailMessage
            {
                From = fromAddress,
                Subject = subject,
                SubjectEncoding = Encoding.UTF8,
                Body = htmlBody,
                BodyEncoding = Encoding.UTF8,
                IsBodyHtml = true
            };

            foreach (var to in toEmails)
            {
                mail.To.Add(to);
            }

            await client.SendMailAsync(mail, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMTP e-postası gönderilemedi ({Host}:{Port}).", host, port);
            throw;
        }
    }

    public List<string> ParseRecipients(string? input)
    {
        var list = new List<string>();
        if (string.IsNullOrWhiteSpace(input)) return list;

        string trimmed = input.Trim();
        if (trimmed.StartsWith('[') && trimmed.EndsWith(']'))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize(trimmed, CorvusJsonSerializerContext.Default.ListString);
                if (parsed != null)
                {
                    foreach (var email in parsed)
                    {
                        var e = email?.Trim();
                        if (!string.IsNullOrWhiteSpace(e) && e.Contains('@') && !list.Contains(e, StringComparer.OrdinalIgnoreCase))
                        {
                            list.Add(e);
                        }
                    }
                    if (list.Count > 0) return list;
                }
            }
            catch { }
        }

        var parts = trimmed.Split(new[] { ',', ';', ' ', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var p in parts)
        {
            if (p.Contains('@') && !list.Contains(p, StringComparer.OrdinalIgnoreCase))
            {
                list.Add(p);
            }
        }

        return list;
    }

    private static string BuildEmailHtml(string title, string message, string badgeColor)
    {
        string encodedTitle = WebUtility.HtmlEncode(title);
        string encodedMessage = WebUtility.HtmlEncode(message).Replace("\n", "<br/>");

        var sb = new StringBuilder();
        sb.AppendLine("<!DOCTYPE html><html><head><meta charset=\"utf-8\">");
        sb.AppendLine("<style>");
        sb.AppendLine("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d13; color: #e5e7eb; margin: 0; padding: 24px; }");
        sb.AppendLine(".container { max-width: 600px; margin: 0 auto; background-color: #141721; border: 1px solid #2a2e3f; border-radius: 12px; overflow: hidden; }");
        sb.AppendLine(".header { background-color: #1a1d29; padding: 20px 24px; border-bottom: 1px solid #2a2e3f; }");
        sb.AppendLine(".header h1 { margin: 0; font-size: 16px; color: #fff; font-weight: 600; }");
        sb.AppendLine(".content { padding: 24px; }");
        sb.Append(".badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; background-color: ").Append(badgeColor).Append("22; color: ").Append(badgeColor).Append("; border: 1px solid ").Append(badgeColor).AppendLine("44; margin-bottom: 16px; }");
        sb.AppendLine(".msg { font-size: 13px; line-height: 1.6; color: #d1d5db; font-family: monospace; background: #0f1117; padding: 14px; border-radius: 8px; border: 1px solid #2a2e3f; }");
        sb.AppendLine(".footer { padding: 16px 24px; background-color: #0f1117; border-top: 1px solid #2a2e3f; font-size: 11px; color: #6b7280; text-align: center; }");
        sb.AppendLine("</style></head><body>");
        sb.AppendLine("<div class=\"container\">");
        sb.AppendLine("  <div class=\"header\"><h1>Corvus Monitoring System</h1></div>");
        sb.AppendLine("  <div class=\"content\">");
        sb.Append("    <div class=\"badge\">").Append(encodedTitle).AppendLine("</div>");
        sb.Append("    <div class=\"msg\">").Append(encodedMessage).AppendLine("</div>");
        sb.AppendLine("  </div>");
        sb.AppendLine("  <div class=\"footer\">Bu e-posta Corvus Monitoring tarafından otomatik olarak gönderilmiştir.</div>");
        sb.AppendLine("</div></body></html>");
        return sb.ToString();
    }
}
