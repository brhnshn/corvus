using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.IO.Pipes;

namespace Corvus.Api.Services.Docker;

public interface IDockerHttpTransport : IDisposable
{
    HttpClient HttpClient { get; }
    Task<Stream> CreateRawDockerStreamAsync(CancellationToken cancellationToken = default);
}

public class DockerHttpTransport : IDockerHttpTransport
{
    private readonly HttpClient _httpClient;
    private readonly string? _dockerSocketEnv;

    public HttpClient HttpClient => _httpClient;

    public DockerHttpTransport(IConfiguration configuration)
    {
        _dockerSocketEnv = Environment.GetEnvironmentVariable("DOCKER_SOCKET")
                           ?? configuration["Docker:SocketPath"];

        var handler = new SocketsHttpHandler
        {
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1),
            ConnectCallback = async (context, cancellationToken) => await CreateRawDockerStreamAsync(cancellationToken)
        };

        _httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost"),
            Timeout = TimeSpan.FromSeconds(15)
        };
    }

    public async Task<Stream> CreateRawDockerStreamAsync(CancellationToken cancellationToken = default)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            string[] candidatePipes = ["dockerDesktopLinuxEngine", "docker_engine"];
            foreach (var pipeName in candidatePipes)
            {
                try
                {
                    var pipe = new NamedPipeClientStream(
                        serverName: ".",
                        pipeName: pipeName,
                        direction: PipeDirection.InOut,
                        options: PipeOptions.Asynchronous);

                    using var connectCts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, connectCts.Token);
                    await pipe.ConnectAsync(linkedCts.Token);
                    return pipe;
                }
                catch
                {
                    // sonraki pipe adayını dene
                }
            }

            throw new InvalidOperationException("Hiçbir Windows Docker named pipe'ına bağlanılamadı.");
        }
        else
        {
            string socketPath = !string.IsNullOrWhiteSpace(_dockerSocketEnv) 
                ? _dockerSocketEnv 
                : "/var/run/docker.sock";

            var endpoint = new UnixDomainSocketEndPoint(socketPath);
            var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);

            try
            {
                await socket.ConnectAsync(endpoint, cancellationToken);
                return new NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        }
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}
