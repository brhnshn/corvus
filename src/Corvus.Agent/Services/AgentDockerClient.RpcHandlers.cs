using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Corvus.Agent.Models;

namespace Corvus.Agent.Services;

// Hub'dan gelen Compose ve systemd RPC eylemlerinin uç sistemde işlenmesi
public partial class AgentDockerClient
{
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
