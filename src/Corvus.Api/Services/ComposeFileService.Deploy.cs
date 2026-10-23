using System.Text;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

// Compose stack yeniden dağıtımı ve güvenli compose dosya yolu çözümleme
public partial class ComposeFileService
{
    public async Task<ComposeDeployResult> DeployComposeAsync(string projectName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(projectName))
        {
            return new ComposeDeployResult { Success = false, Error = "Proje adı boş olamaz." };
        }

        string? resolvedFilePath = await ResolveComposeFilePathAsync(projectName, cancellationToken);
        if (string.IsNullOrWhiteSpace(resolvedFilePath) || !File.Exists(resolvedFilePath))
        {
            return new ComposeDeployResult { Success = false, Error = $"'{projectName}' için compose dosyası bulunamadı." };
        }

        string workingDir = Path.GetDirectoryName(resolvedFilePath) ?? AppContext.BaseDirectory;

        try
        {
            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "docker",
                WorkingDirectory = workingDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            psi.ArgumentList.Add("compose");
            psi.ArgumentList.Add("-f");
            psi.ArgumentList.Add(resolvedFilePath);
            psi.ArgumentList.Add("up");
            psi.ArgumentList.Add("-d");
            psi.ArgumentList.Add("--remove-orphans");

            System.Diagnostics.Process? proc = null;
            try
            {
                proc = System.Diagnostics.Process.Start(psi);
            }
            catch (System.ComponentModel.Win32Exception)
            {
                // docker bulunamadıysa docker-compose dene
                psi.FileName = "docker-compose";
                psi.ArgumentList.Clear();
                psi.ArgumentList.Add("-f");
                psi.ArgumentList.Add(resolvedFilePath);
                psi.ArgumentList.Add("up");
                psi.ArgumentList.Add("-d");
                psi.ArgumentList.Add("--remove-orphans");
                proc = System.Diagnostics.Process.Start(psi);
            }

            if (proc == null)
            {
                return new ComposeDeployResult { Success = false, Error = "Docker Compose işlemi başlatılamadı." };
            }

            using (proc)
            {
                string stdOut = await proc.StandardOutput.ReadToEndAsync(cancellationToken);
                string stdErr = await proc.StandardError.ReadToEndAsync(cancellationToken);
                await proc.WaitForExitAsync(cancellationToken);

                string fullOutput = string.IsNullOrWhiteSpace(stdErr)
                    ? stdOut
                    : (string.IsNullOrWhiteSpace(stdOut) ? stdErr : $"{stdOut}\n{stdErr}").Trim();

                bool success = proc.ExitCode == 0;
                if (success)
                {
                    _dockerService.InvalidateContainersCache();
                }

                return new ComposeDeployResult
                {
                    Success = success,
                    Output = fullOutput,
                    ExitCode = proc.ExitCode,
                    Error = success ? null : fullOutput
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Compose deploy hatası: {Project}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(projectName));
            return new ComposeDeployResult
            {
                Success = false,
                ExitCode = -1,
                Error = $"Dağıtım yürütülemedi: {ex.Message}"
            };
        }
    }

    private async Task<string?> ResolveComposeFilePathAsync(string projectName, CancellationToken cancellationToken)
    {
        var containers = await _dockerService.GetContainersAsync(cancellationToken);
        var projectContainer = containers.FirstOrDefault(c => 
            c.Labels != null && 
            c.Labels.TryGetValue("com.docker.compose.project", out var proj) &&
            string.Equals(proj, projectName, StringComparison.OrdinalIgnoreCase)
        );

        if (projectContainer?.Labels == null)
        {
            return null;
        }

        projectContainer.Labels.TryGetValue("com.docker.compose.project.working_dir", out var workingDir);
        projectContainer.Labels.TryGetValue("com.docker.compose.project.config_files", out var configFiles);

        // Olası aday dosyalar
        var candidates = new List<string>();

        if (!string.IsNullOrWhiteSpace(configFiles))
        {
            var files = configFiles.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
            foreach (var f in files)
            {
                if (Path.IsPathRooted(f))
                {
                    candidates.Add(f);
                }
                else if (!string.IsNullOrWhiteSpace(workingDir))
                {
                    candidates.Add(Path.Combine(workingDir, f));
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(workingDir))
        {
            candidates.Add(Path.Combine(workingDir, "compose.yaml"));
            candidates.Add(Path.Combine(workingDir, "compose.yml"));
            candidates.Add(Path.Combine(workingDir, "docker-compose.yaml"));
            candidates.Add(Path.Combine(workingDir, "docker-compose.yml"));
        }

        foreach (var path in candidates)
        {
            // Path traversal ve uzantı güvenlik filtresi
            try
            {
                string fullPath = Path.GetFullPath(path);
                string ext = Path.GetExtension(fullPath).ToLowerInvariant();
                if (ext is not (".yml" or ".yaml"))
                {
                    continue;
                }

                if (File.Exists(fullPath))
                {
                    return fullPath;
                }
            }
            catch
            {
                // Geçersiz dosya yolu formatı
            }
        }

        // Dosya fiziksel olarak yoksa bile ilk geçerli aday dönülebilir
        foreach (var path in candidates)
        {
            try
            {
                string fullPath = Path.GetFullPath(path);
                string ext = Path.GetExtension(fullPath).ToLowerInvariant();
                if (ext is ".yml" or ".yaml")
                {
                    return fullPath;
                }
            }
            catch { }
        }

        return null;
    }
}
