using System.Net;
using System.Net.Sockets;
using System.Text;
using Corvus.Api.Services.Docker;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Corvus.Api.Tests;

public class DockerEndpointTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("npipe:////./pipe/docker_engine")]
    public void Parse_Empty_Or_NamedPipe_ReturnsNull(string? value)
    {
        Assert.Null(DockerEndpoint.Parse(value));
    }

    [Theory]
    [InlineData("unix:///var/run/docker.sock", "/var/run/docker.sock")]
    [InlineData("/var/run/docker.sock", "/var/run/docker.sock")]
    [InlineData("/custom/path.sock", "/custom/path.sock")]
    public void Parse_UnixForms_ReturnsSocketPath(string value, string expected)
    {
        var ep = DockerEndpoint.Parse(value);
        Assert.NotNull(ep);
        Assert.False(ep!.IsTcp);
        Assert.Equal(expected, ep.UnixSocketPath);
    }

    [Theory]
    [InlineData("tcp://socket-proxy:2375", "socket-proxy", 2375)]
    [InlineData("tcp://10.0.0.5:4243", "10.0.0.5", 4243)]
    [InlineData("tcp://dockerhost", "dockerhost", 2375)]
    public void Parse_Tcp_ReturnsHostAndPort(string value, string host, int port)
    {
        var ep = DockerEndpoint.Parse(value);
        Assert.NotNull(ep);
        Assert.True(ep!.IsTcp);
        Assert.Equal(host, ep.TcpHost);
        Assert.Equal(port, ep.TcpPort);
    }

    [Theory]
    [InlineData("https://host:2376")]
    [InlineData("ssh://user@host")]
    [InlineData("tcp://")]
    public void Parse_UnsupportedOrInvalid_Throws(string value)
    {
        Assert.Throws<NotSupportedException>(() => DockerEndpoint.Parse(value));
    }

    [Fact]
    public async Task Transport_TcpEndpoint_SpeaksPlainHttp()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        int port = ((IPEndPoint)listener.LocalEndpoint).Port;

        var server = Task.Run(async () =>
        {
            using var client = await listener.AcceptTcpClientAsync();
            using var stream = client.GetStream();
            var buf = new byte[4096];
            int read = await stream.ReadAsync(buf);
            string request = Encoding.ASCII.GetString(buf, 0, read);
            var body = "OK";
            var resp = $"HTTP/1.1 200 OK\r\nContent-Length: {body.Length}\r\nConnection: close\r\n\r\n{body}";
            await stream.WriteAsync(Encoding.ASCII.GetBytes(resp));
            return request;
        });

        var previousHost = Environment.GetEnvironmentVariable("DOCKER_HOST");
        Environment.SetEnvironmentVariable("DOCKER_HOST", $"tcp://127.0.0.1:{port}");
        try
        {
            using var transport = new DockerHttpTransport(new ConfigurationBuilder().Build());
            var response = await transport.HttpClient.GetAsync("/_ping");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("OK", await response.Content.ReadAsStringAsync());
            Assert.StartsWith("GET /_ping", await server);
        }
        finally
        {
            Environment.SetEnvironmentVariable("DOCKER_HOST", previousHost);
            listener.Stop();
        }
    }
}
