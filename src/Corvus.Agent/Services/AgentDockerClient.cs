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

public class AgentDockerClient : IAgentDockerClient
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

    private async Task<string> SendDockerHttpAsync(string method, string path, CancellationToken ct)
    {
        byte[] rawBody = await SendDockerHttpRawAsync(method, path, ct);
        return Encoding.UTF8.GetString(rawBody);
    }

    private async Task<byte[]> SendDockerHttpRawAsync(string method, string path, CancellationToken ct)
    {
        if (path.Contains('\r') || path.Contains('\n') || method.Contains('\r') || method.Contains('\n'))
        {
            throw new ArgumentException("CRLF injection detected in HTTP request.");
        }

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
        return ExtractHttpResponseBody(allBytes);
    }

    private static byte[] ExtractHttpResponseBody(byte[] allBytes)
    {
        // Find CRLF CRLF header-body separator
        int headerEnd = -1;
        for (int i = 0; i <= allBytes.Length - 4; i++)
        {
            if (allBytes[i] == (byte)'\r' &&
                allBytes[i + 1] == (byte)'\n' &&
                allBytes[i + 2] == (byte)'\r' &&
                allBytes[i + 3] == (byte)'\n')
            {
                headerEnd = i + 4;
                break;
            }
        }

        if (headerEnd < 0) return allBytes;

        string headerText = Encoding.ASCII.GetString(allBytes, 0, headerEnd);
        bool isChunked = headerText.IndexOf("Transfer-Encoding: chunked", StringComparison.OrdinalIgnoreCase) >= 0;

        ReadOnlySpan<byte> bodySpan = allBytes.AsSpan(headerEnd);

        if (!isChunked)
        {
            return bodySpan.ToArray();
        }

        // Parse HTTP/1.1 chunked transfer encoding
        using var unchunked = new MemoryStream();
        int offset = 0;

        while (offset < bodySpan.Length)
        {
            // Find CRLF of chunk size line
            int lineEnd = -1;
            for (int i = offset; i <= bodySpan.Length - 2; i++)
            {
                if (bodySpan[i] == (byte)'\r' && bodySpan[i + 1] == (byte)'\n')
                {
                    lineEnd = i;
                    break;
                }
            }

            if (lineEnd < 0) break;

            string chunkSizeHex = Encoding.ASCII.GetString(bodySpan.Slice(offset, lineEnd - offset)).Trim();
            // Ignore chunk extensions if present (e.g., "1a;ext=val")
            int semi = chunkSizeHex.IndexOf(';');
            if (semi >= 0) chunkSizeHex = chunkSizeHex[..semi].Trim();

            if (!int.TryParse(chunkSizeHex, System.Globalization.NumberStyles.HexNumber, null, out int chunkSize) || chunkSize < 0)
            {
                break;
            }

            if (chunkSize == 0)
            {
                // Last chunk
                break;
            }

            int chunkDataStart = lineEnd + 2;
            if (chunkDataStart + chunkSize > bodySpan.Length)
            {
                // Incomplete chunk
                int remaining = bodySpan.Length - chunkDataStart;
                if (remaining > 0)
                {
                    unchunked.Write(bodySpan.Slice(chunkDataStart, remaining));
                }
                break;
            }

            unchunked.Write(bodySpan.Slice(chunkDataStart, chunkSize));
            offset = chunkDataStart + chunkSize + 2; // skip trailing \r\n
        }

        return unchunked.ToArray();
    }

    private static List<string> DemuxDockerStream(ReadOnlySpan<byte> buffer)
    {
        var lines = new List<string>();
        int offset = 0;
        bool detectedMultiplexed = false;

        while (offset + 8 <= buffer.Length)
        {
            byte streamType = buffer[offset];
            byte b1 = buffer[offset + 1];
            byte b2 = buffer[offset + 2];
            byte b3 = buffer[offset + 3];

            // Docker 8-byte frame header (streamType: 1=stdout, 2=stderr)
            if ((streamType == 1 || streamType == 2) && b1 == 0 && b2 == 0 && b3 == 0)
            {
                int payloadSize = System.Buffers.Binary.BinaryPrimitives.ReadInt32BigEndian(buffer.Slice(offset + 4, 4));

                if (payloadSize >= 0 && offset + 8 + payloadSize <= buffer.Length)
                {
                    detectedMultiplexed = true;
                    var payloadSpan = buffer.Slice(offset + 8, payloadSize);
                    string text = Encoding.UTF8.GetString(payloadSpan);
                    using var reader = new StringReader(text);
                    string? line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        if (!string.IsNullOrWhiteSpace(line))
                        {
                            lines.Add(line);
                        }
                    }
                    offset += 8 + payloadSize;
                    continue;
                }
            }

            break;
        }

        if (!detectedMultiplexed && buffer.Length > 0)
        {
            string raw = Encoding.UTF8.GetString(buffer);
            using var reader = new StringReader(raw);
            string? line;
            while ((line = reader.ReadLine()) != null)
            {
                if (!string.IsNullOrWhiteSpace(line))
                {
                    lines.Add(line);
                }
            }
        }

        return lines;
    }

    private async Task<DockerRpcResponse> HandleComposeRpcActionAsync(string action, DockerRpcRequest request, CancellationToken ct)
    {
        string projectName = (request.ProjectName ?? "").Trim();
        if (string.IsNullOrWhiteSpace(projectName) || !ProjectNameRegex.IsMatch(projectName))
        {
            return new DockerRpcResponse(Success: false, Message: "Valid ProjectName is required for compose actions.");
        }

        string baseStacksDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "stacks"));
        string stackDir = Path.GetFullPath(Path.Combine(baseStacksDir, projectName));

        if (!stackDir.StartsWith(baseStacksDir + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            return new DockerRpcResponse(Success: false, Message: "Path traversal detected in projectName.");
        }

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
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                psi.ArgumentList.Add("list-units");
                psi.ArgumentList.Add("--type=service");
                psi.ArgumentList.Add("--output=json");

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
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                psi.ArgumentList.Add(cmdAction);
                psi.ArgumentList.Add(unitName);

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
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                psi.ArgumentList.Add("-u");
                psi.ArgumentList.Add(unitName);
                psi.ArgumentList.Add("-n");
                psi.ArgumentList.Add(tail.ToString());
                psi.ArgumentList.Add("--no-pager");

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
}
