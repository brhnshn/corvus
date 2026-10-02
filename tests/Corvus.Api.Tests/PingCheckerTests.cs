using System.Net.NetworkInformation;
using Corvus.Api.Models;
using Xunit;

namespace Corvus.Api.Tests;

public class PingCheckerTests
{
    [Fact]
    public void Service_Model_Supports_Ping_CheckType()
    {
        var svc = new Service
        {
            Name = "Gateway Router",
            CheckType = "ping",
            Url = "192.168.1.1",
            TimeoutSeconds = 3,
            IsUptimeEnabled = true
        };

        Assert.Equal("ping", svc.CheckType);
        Assert.Equal("192.168.1.1", svc.Url);
        Assert.True(svc.IsUptimeEnabled);
    }

    [Theory]
    [InlineData("192.168.1.1", "192.168.1.1")]
    [InlineData("ping://192.168.1.1", "192.168.1.1")]
    [InlineData("https://example.com/health", "example.com")]
    [InlineData("http://10.0.0.1:8080", "10.0.0.1")]
    [InlineData("1.1.1.1:53", "1.1.1.1")]
    [InlineData("google.com/test", "google.com")]
    public void ExtractHost_Formats_Raw_Targets_Accurately(string raw, string expected)
    {
        string host = ExtractHost(raw);
        Assert.Equal(expected, host);
    }

    [Fact]
    public async Task Ping_Localhost_Returns_Success()
    {
        using var ping = new Ping();
        var reply = await ping.SendPingAsync("127.0.0.1", 3000);

        Assert.NotNull(reply);
        Assert.Equal(IPStatus.Success, reply.Status);
        Assert.True(reply.RoundtripTime >= 0);
    }

    [Fact]
    public void TestConnectionRequest_Serialization_Supports_Ping()
    {
        var req = new TestConnectionRequest(
            CheckType: "ping",
            Url: "127.0.0.1",
            TimeoutSeconds: 2
        );

        Assert.Equal("ping", req.CheckType);
        Assert.Equal("127.0.0.1", req.Url);
        Assert.Equal(2, req.TimeoutSeconds);
    }

    private static string ExtractHost(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;
        raw = raw.Trim();
        if (raw.StartsWith("ping://", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw[7..];
        }
        else if (raw.Contains("://", StringComparison.Ordinal))
        {
            try
            {
                var uri = new Uri(raw);
                return uri.Host;
            }
            catch { }
        }

        int slashIdx = raw.IndexOf('/');
        if (slashIdx >= 0) raw = raw[..slashIdx];
        int colonIdx = raw.IndexOf(':');
        if (colonIdx >= 0) raw = raw[..colonIdx];
        return raw.Trim();
    }
}
