using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using Corvus.Agent.Models;

namespace Corvus.Agent.Services;

public interface IAgentDockerClient
{
    Task<List<SystemContainerCacheEntity>> GetContainersAsync(CancellationToken ct = default);
    Task<DockerRpcResponse> ExecuteRpcActionAsync(DockerRpcRequest request, CancellationToken ct = default);
}

public class AgentDockerClient : IAgentDockerClient
{
    private const string SocketPath = "/var/run/docker.sock";

    public async Task<List<SystemContainerCacheEntity>> GetContainersAsync(CancellationToken ct = default)
    {
        var containers = new List<SystemContainerCacheEntity>();

        if (!File.Exists(SocketPath))
        {
            return containers; // Docker soketi yoksa veya Windows yerel test ise boş liste
        }

        try
        {
            string rawJson = await SendDockerHttpAsync("GET", "/containers/json?all=1", ct);
            using var doc = JsonDocument.Parse(rawJson);

            string nowIso = DateTime.UtcNow.ToString("o");

            foreach (var elem in doc.RootElement.EnumerateArray())
            {
                string id = elem.GetProperty("Id").GetString() ?? "";
                string shortId = id.Length > 12 ? id[..12] : id;

                string name = "";
                if (elem.TryGetProperty("Names", out var names) && names.GetArrayLength() > 0)
                {
                    name = names[0].GetString()?.TrimStart('/') ?? shortId;
                }

                string image = elem.TryGetProperty("Image", out var img) ? img.GetString() ?? "" : "";
                string state = elem.TryGetProperty("State", out var st) ? st.GetString() ?? "unknown" : "unknown";
                string status = elem.TryGetProperty("Status", out var stat) ? stat.GetString() ?? "" : "";

                containers.Add(new SystemContainerCacheEntity
                {
                    ContainerId = id,
                    Name = name,
                    Image = image,
                    State = state,
                    Status = status,
                    CpuPercent = 0.0,
                    MemoryBytes = 0,
                    PortsJson = "[]",
                    UpdatedAt = nowIso
                });
            }
        }
        catch { }

        return containers;
    }

    public async Task<DockerRpcResponse> ExecuteRpcActionAsync(DockerRpcRequest request, CancellationToken ct = default)
    {
        if (!File.Exists(SocketPath))
        {
            return new DockerRpcResponse(Success: false, Message: "Docker socket not found on agent host.");
        }

        if (string.IsNullOrWhiteSpace(request.ContainerId))
        {
            return new DockerRpcResponse(Success: false, Message: "ContainerId is required.");
        }

        string cid = request.ContainerId.Trim();

        try
        {
            switch (request.Action.ToLowerInvariant())
            {
                case "start":
                    await SendDockerHttpAsync("POST", $"/containers/{cid}/start", ct);
                    return new DockerRpcResponse(Success: true, Message: $"Container {cid} started.");

                case "stop":
                    await SendDockerHttpAsync("POST", $"/containers/{cid}/stop", ct);
                    return new DockerRpcResponse(Success: true, Message: $"Container {cid} stopped.");

                case "restart":
                    await SendDockerHttpAsync("POST", $"/containers/{cid}/restart", ct);
                    return new DockerRpcResponse(Success: true, Message: $"Container {cid} restarted.");

                case "logs":
                    int tail = request.TailLines ?? 100;
                    string logOutput = await SendDockerHttpAsync("GET", $"/containers/{cid}/logs?stdout=1&stderr=1&tail={tail}", ct);
                    var lines = logOutput.Split('\n', StringSplitOptions.RemoveEmptyEntries).ToList();
                    return new DockerRpcResponse(Success: true, Logs: lines);

                default:
                    return new DockerRpcResponse(Success: false, Message: $"Unknown action: {request.Action}");
            }
        }
        catch (Exception ex)
        {
            return new DockerRpcResponse(Success: false, Message: $"Docker operation failed: {ex.Message}");
        }
    }

    private static async Task<string> SendDockerHttpAsync(string method, string path, CancellationToken ct)
    {
        using var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
        var endpoint = new UnixDomainSocketEndPoint(SocketPath);
        await socket.ConnectAsync(endpoint, ct);

        string request = $"{method} {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n";
        byte[] reqBytes = Encoding.UTF8.GetBytes(request);
        await socket.SendAsync(reqBytes, SocketFlags.None, ct);

        using var ms = new MemoryStream();
        var buffer = new byte[8192];
        int bytesRead;

        while ((bytesRead = await socket.ReceiveAsync(buffer, SocketFlags.None, ct)) > 0)
        {
            ms.Write(buffer, 0, bytesRead);
        }

        byte[] allBytes = ms.ToArray();
        string response = Encoding.UTF8.GetString(allBytes);

        int bodyIndex = response.IndexOf("\r\n\r\n", StringComparison.Ordinal);
        if (bodyIndex >= 0)
        {
            return response[(bodyIndex + 4)..];
        }

        return response;
    }
}
