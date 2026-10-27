using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.IO.Pipes;

namespace Corvus.Api.Services.Docker;

public interface IDockerHttpTransport : IDisposable
{
    HttpClient HttpClient { get; }
    Task<Stream> CreateRawDockerStreamAsync(CancellationToken cancellationToken = default);
}

/// <summary>DOCKER_HOST / DOCKER_SOCKET değerinin ayrıştırılmış hali (unix soket yolu veya düz TCP uç noktası).</summary>
public sealed record DockerEndpoint(string? UnixSocketPath, string? TcpHost, int TcpPort)
{
    public bool IsTcp => TcpHost is not null;

    /// <summary>
    /// "unix:///var/run/docker.sock", "/var/run/docker.sock" veya "tcp://host:port" biçimlerini ayrıştırır.
    /// TLS gerektiren (tcp+tls/https) ve desteklenmeyen şemalar için NotSupportedException fırlatır.
    /// Boş değer null döner (varsayılan soket/pipe kullanılır).
    /// </summary>
    public static DockerEndpoint? Parse(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();

        if (v.StartsWith("unix://", StringComparison.OrdinalIgnoreCase))
        {
            var path = v["unix://".Length..];
            return string.IsNullOrWhiteSpace(path) ? null : new DockerEndpoint(path, null, 0);
        }

        if (v.StartsWith("npipe://", StringComparison.OrdinalIgnoreCase))
        {
            // Windows named pipe adayları zaten otomatik denenir.
            return null;
        }

        if (v.StartsWith("tcp://", StringComparison.OrdinalIgnoreCase))
        {
            if (!Uri.TryCreate(v, UriKind.Absolute, out var uri) || string.IsNullOrEmpty(uri.Host))
            {
                throw new NotSupportedException($"Geçersiz Docker TCP adresi: '{value}'. Beklenen biçim: tcp://host:port");
            }
            return new DockerEndpoint(null, uri.Host, uri.Port > 0 ? uri.Port : 2375);
        }

        if (v.Contains("://", StringComparison.Ordinal))
        {
            throw new NotSupportedException(
                $"Desteklenmeyen Docker uç noktası '{value}'. TLS'li TCP desteklenmiyor; TLS'siz tcp://host:port (ör. docker-socket-proxy) veya unix:// kullanın.");
        }

        // Şemasız değer: eski DOCKER_SOCKET davranışı (soket yolu)
        return new DockerEndpoint(v, null, 0);
    }
}

public class DockerHttpTransport : IDockerHttpTransport
{
    private readonly HttpClient _httpClient;
    private readonly string? _dockerHostEnv;
    private readonly ILogger? _logger;

    public HttpClient HttpClient => _httpClient;

    public DockerHttpTransport(IConfiguration configuration, ILogger? logger = null)
    {
        _logger = logger;
        // DOCKER_HOST, DOCKER_SOCKET'ten önceliklidir (Dockerfile DOCKER_SOCKET'i varsayılan olarak tanımlar).
        _dockerHostEnv = Environment.GetEnvironmentVariable("DOCKER_HOST")
                         ?? Environment.GetEnvironmentVariable("DOCKER_SOCKET")
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
        DockerEndpoint? endpoint;
        try
        {
            endpoint = DockerEndpoint.Parse(_dockerHostEnv);
        }
        catch (NotSupportedException ex)
        {
            _logger?.LogError("{Message}", ex.Message);
            throw;
        }

        if (endpoint is { IsTcp: true })
        {
            var tcpSocket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
            try
            {
                await tcpSocket.ConnectAsync(endpoint.TcpHost!, endpoint.TcpPort, cancellationToken);
                return new NetworkStream(tcpSocket, ownsSocket: true);
            }
            catch
            {
                tcpSocket.Dispose();
                throw;
            }
        }

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
            string socketPath = endpoint?.UnixSocketPath ?? "/var/run/docker.sock";

            var unixEndpoint = new UnixDomainSocketEndPoint(socketPath);
            var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);

            try
            {
                await socket.ConnectAsync(unixEndpoint, cancellationToken);
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
