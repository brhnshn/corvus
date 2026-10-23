using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Corvus.Agent.Models;

namespace Corvus.Agent.Services;

public interface IAgentDockerClient
{
    Task<List<SystemContainerCacheEntity>> GetContainersAsync(CancellationToken ct = default);
    Task<DockerRpcResponse> ExecuteRpcActionAsync(DockerRpcRequest request, CancellationToken ct = default);
}

public partial class AgentDockerClient : IAgentDockerClient
{
    private static readonly Regex ProjectNameRegex = new(@"^[a-zA-Z0-9][a-zA-Z0-9_.-]*$", RegexOptions.Compiled);
    private static readonly Regex ContainerIdRegex = new(@"^[a-zA-Z0-9_.-]{1,128}$", RegexOptions.Compiled);

    private readonly string _socketPath;

    public AgentDockerClient(string socketPath = "/var/run/docker.sock")
    {
        _socketPath = socketPath;
    }

    public async Task<List<SystemContainerCacheEntity>> GetContainersAsync(CancellationToken ct = default)
    {
        var containers = new List<SystemContainerCacheEntity>();

        if (!File.Exists(_socketPath))
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
        if (!File.Exists(_socketPath))
        {
            return new DockerRpcResponse(Success: false, Message: "Docker socket not found on agent host.");
        }

        string action = request.Action.ToLowerInvariant();
        if (action.StartsWith("compose."))
        {
            return await HandleComposeRpcActionAsync(action, request, ct);
        }

        if (action.StartsWith("systemd."))
        {
            return await HandleSystemdRpcActionAsync(action, request, ct);
        }

        if (string.IsNullOrWhiteSpace(request.ContainerId))
        {
            return new DockerRpcResponse(Success: false, Message: "ContainerId is required.");
        }

        string cid = request.ContainerId.Trim();
        if (!ContainerIdRegex.IsMatch(cid))
        {
            return new DockerRpcResponse(Success: false, Message: "Invalid ContainerId format.");
        }

        string escapedCid = Uri.EscapeDataString(cid);

        try
        {
            switch (action)
            {
                case "start":
                    await SendDockerHttpAsync("POST", $"/containers/{escapedCid}/start", ct);
                    return new DockerRpcResponse(Success: true, Message: $"Container {cid} started.");

                case "stop":
                    await SendDockerHttpAsync("POST", $"/containers/{escapedCid}/stop", ct);
                    return new DockerRpcResponse(Success: true, Message: $"Container {cid} stopped.");

                case "restart":
                    await SendDockerHttpAsync("POST", $"/containers/{escapedCid}/restart", ct);
                    return new DockerRpcResponse(Success: true, Message: $"Container {cid} restarted.");

                case "delete":
                    await SendDockerHttpAsync("DELETE", $"/containers/{escapedCid}?force=true&v=false", ct);
                    return new DockerRpcResponse(Success: true, Message: $"Container {cid} deleted.");

                case "logs":
                    int tail = request.TailLines ?? 100;
                    byte[] logBytes = await SendDockerHttpRawAsync("GET", $"/containers/{escapedCid}/logs?stdout=1&stderr=1&tail={tail}", ct);
                    var lines = DemuxDockerStream(logBytes);
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

    private static readonly System.Text.RegularExpressions.Regex AgentUnitRegex = new(@"^[a-zA-Z0-9@_.-]+\.service$", System.Text.RegularExpressions.RegexOptions.Compiled);
}
