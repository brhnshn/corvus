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

        try
        {
            switch (action)
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

    private async Task<DockerRpcResponse> HandleComposeRpcActionAsync(string action, DockerRpcRequest request, CancellationToken ct)
    {
        string projectName = (request.ProjectName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(projectName))
        {
            return new DockerRpcResponse(Success: false, Message: "ProjectName is required for compose actions.");
        }

        string stackDir = Path.Combine(AppContext.BaseDirectory, "stacks", projectName);
        Directory.CreateDirectory(stackDir);

        if (action == "compose.save")
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(request.FileContent))
                {
                    string yamlPath = Path.Combine(stackDir, "compose.yaml");
                    await File.WriteAllTextAsync(yamlPath, request.FileContent, Encoding.UTF8, ct);
                }

                if (request.EnvContent != null)
                {
                    string envPath = Path.Combine(stackDir, ".env");
                    await File.WriteAllTextAsync(envPath, request.EnvContent, Encoding.UTF8, ct);
                }

                return new DockerRpcResponse(Success: true, Message: $"Compose configuration saved for project {projectName}.");
            }
            catch (Exception ex)
            {
                return new DockerRpcResponse(Success: false, Message: $"Failed to save compose files: {ex.Message}");
            }
        }

        if (action == "compose.up")
        {
            try
            {
                string yamlPath = Path.Combine(stackDir, "compose.yaml");
                if (!File.Exists(yamlPath))
                {
                    yamlPath = Path.Combine(stackDir, "docker-compose.yml");
                }

                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "docker",
                    Arguments = File.Exists(yamlPath) ? $"compose -f \"{yamlPath}\" up -d" : "compose up -d",
                    WorkingDirectory = stackDir,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var proc = System.Diagnostics.Process.Start(psi);
                if (proc == null)
                {
                    return new DockerRpcResponse(Success: false, Message: "Failed to start docker compose process.");
                }

                string stdOut = await proc.StandardOutput.ReadToEndAsync(ct);
                string stdErr = await proc.StandardError.ReadToEndAsync(ct);
                await proc.WaitForExitAsync(ct);

                bool success = proc.ExitCode == 0;
                string output = string.IsNullOrWhiteSpace(stdErr) ? stdOut : $"{stdOut}\n{stdErr}".Trim();
                return new DockerRpcResponse(Success: success, Message: output);
            }
            catch (Exception ex)
            {
                return new DockerRpcResponse(Success: false, Message: $"Failed to execute compose up: {ex.Message}");
            }
        }

        return new DockerRpcResponse(Success: false, Message: $"Unknown compose action: {action}");
    }

    private static readonly System.Text.RegularExpressions.Regex AgentUnitRegex = new(@"^[a-zA-Z0-9@_.-]+\.service$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private async Task<DockerRpcResponse> HandleSystemdRpcActionAsync(string action, DockerRpcRequest request, CancellationToken ct)
    {
        if (!OperatingSystem.IsLinux())
        {
            return new DockerRpcResponse(Success: false, Message: "Systemd is only supported on Linux hosts.");
        }

        try
        {
            if (action == "systemd.list")
            {
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "systemctl",
                    Arguments = "list-units --type=service --output=json",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var proc = System.Diagnostics.Process.Start(psi);
                if (proc == null) return new DockerRpcResponse(Success: false, Message: "Failed to start systemctl.");

                string stdOut = await proc.StandardOutput.ReadToEndAsync(ct);
                await proc.WaitForExitAsync(ct);

                return new DockerRpcResponse(Success: true, Message: stdOut);
            }

            if (action == "systemd.action")
            {
                string unitName = (request.ProjectName ?? "").Trim();
                if (!AgentUnitRegex.IsMatch(unitName))
                {
                    return new DockerRpcResponse(Success: false, Message: "Invalid unit name.");
                }

                string cmdAction = (request.ContainerId ?? "restart").Trim().ToLowerInvariant();
                if (cmdAction is not ("start" or "stop" or "restart"))
                {
                    return new DockerRpcResponse(Success: false, Message: "Invalid action.");
                }

                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "systemctl",
                    Arguments = $"{cmdAction} \"{unitName}\"",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var proc = System.Diagnostics.Process.Start(psi);
                if (proc == null) return new DockerRpcResponse(Success: false, Message: "Failed to start systemctl.");

                string err = await proc.StandardError.ReadToEndAsync(ct);
                await proc.WaitForExitAsync(ct);

                return proc.ExitCode == 0
                    ? new DockerRpcResponse(Success: true, Message: $"Unit {unitName} {cmdAction} executed.")
                    : new DockerRpcResponse(Success: false, Message: err);
            }

            if (action == "systemd.logs")
            {
                string unitName = (request.ProjectName ?? "").Trim();
                if (!AgentUnitRegex.IsMatch(unitName))
                {
                    return new DockerRpcResponse(Success: false, Message: "Invalid unit name.");
                }

                int tail = request.TailLines ?? 100;
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "journalctl",
                    Arguments = $"-u \"{unitName}\" -n {tail} --no-pager",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var proc = System.Diagnostics.Process.Start(psi);
                if (proc == null) return new DockerRpcResponse(Success: false, Message: "Failed to start journalctl.");

                string stdOut = await proc.StandardOutput.ReadToEndAsync(ct);
                await proc.WaitForExitAsync(ct);

                var lines = stdOut.Split('\n', StringSplitOptions.RemoveEmptyEntries).ToList();
                return new DockerRpcResponse(Success: true, Logs: lines);
            }

            return new DockerRpcResponse(Success: false, Message: $"Unknown systemd action: {action}");
        }
        catch (Exception ex)
        {
            return new DockerRpcResponse(Success: false, Message: $"Systemd operation failed: {ex.Message}");
        }
    }

    private async Task<string> SendDockerHttpAsync(string method, string path, CancellationToken ct)
    {
        using var socket = new Socket(AddressFamily.Unix, SocketType.Stream, ProtocolType.Unspecified);
        var endpoint = new UnixDomainSocketEndPoint(_socketPath);
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
