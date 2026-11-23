using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Xunit;

namespace Corvus.Api.Tests;

// HttpClient Information seviyesinde istek URL'ini loglar; Telegram bot token'ı ve webhook token'ları URL'dedir
public class LoggingSecretsTests
{
    private static string FindApiAppSettings()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "src", "Corvus.Api", "appsettings.json")))
        {
            dir = dir.Parent;
        }
        Assert.NotNull(dir);
        return Path.Combine(dir!.FullName, "src", "Corvus.Api", "appsettings.json");
    }

    [Fact]
    public void Http_client_request_urls_are_not_logged_in_production()
    {
        var config = new ConfigurationBuilder().AddJsonFile(FindApiAppSettings()).Build();

        string? level = config["Logging:LogLevel:System.Net.Http.HttpClient"];

        Assert.NotNull(level);
        Assert.True(Enum.Parse<LogLevel>(level!) >= LogLevel.Warning, $"HttpClient log seviyesi {level}");
    }
}
