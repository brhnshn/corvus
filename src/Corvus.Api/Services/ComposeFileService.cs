using System.Text;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IComposeFileService
{
    Task<ComposeFileDto> GetComposeFileAsync(string projectName, CancellationToken cancellationToken = default);
    Task<GenericApiResponse> SaveComposeFileAsync(string projectName, SaveComposeFileRequest request, CancellationToken cancellationToken = default);
    Task<ComposeDeployResult> DeployComposeAsync(string projectName, CancellationToken cancellationToken = default);
}

public class ComposeFileService : IComposeFileService
{
    private readonly IDockerService _dockerService;
    private readonly ILogger<ComposeFileService> _logger;

    public ComposeFileService(IDockerService dockerService, ILogger<ComposeFileService> logger)
    {
        _dockerService = dockerService;
        _logger = logger;
    }

    public async Task<ComposeFileDto> GetComposeFileAsync(string projectName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(projectName))
        {
            return new ComposeFileDto
            {
                ProjectName = projectName,
                Exists = false,
                Error = "Proje adı boş olamaz."
            };
        }

        string? resolvedFilePath = await ResolveComposeFilePathAsync(projectName, cancellationToken);
        if (string.IsNullOrWhiteSpace(resolvedFilePath))
        {
            return new ComposeFileDto
            {
                ProjectName = projectName,
                Exists = false,
                Error = $"'{projectName}' Compose projesine ait geçerli bir compose.yaml veya docker-compose.yml dosyası bulunamadı."
            };
        }

        try
        {
            if (!File.Exists(resolvedFilePath))
            {
                return new ComposeFileDto
                {
                    ProjectName = projectName,
                    FilePath = resolvedFilePath,
                    Exists = false,
                    Error = $"Compose dosyası diskte bulunamadı: {resolvedFilePath}"
                };
            }

            string content = await File.ReadAllTextAsync(resolvedFilePath, Encoding.UTF8, cancellationToken);
            var fileInfo = new FileInfo(resolvedFilePath);

            string dir = Path.GetDirectoryName(resolvedFilePath) ?? "";
            string envPath = Path.Combine(dir, ".env");
            string? envContent = null;
            bool envExists = File.Exists(envPath);
            if (envExists)
            {
                try
                {
                    envContent = await File.ReadAllTextAsync(envPath, Encoding.UTF8, cancellationToken);
                }
                catch { }
            }

            return new ComposeFileDto
            {
                ProjectName = projectName,
                FilePath = resolvedFilePath,
                Content = content,
                EnvContent = envContent,
                EnvFilePath = envPath,
                EnvExists = envExists,
                LastModified = fileInfo.LastWriteTimeUtc,
                Exists = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Compose dosyası okunurken hata: {Project} - {Path}",
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(projectName),
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(resolvedFilePath));
            return new ComposeFileDto
            {
                ProjectName = projectName,
                FilePath = resolvedFilePath,
                Exists = false,
                Error = $"Dosya okuma hatası: {ex.Message}"
            };
        }
    }

    public async Task<GenericApiResponse> SaveComposeFileAsync(string projectName, SaveComposeFileRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(projectName))
        {
            return new GenericApiResponse(false, "Proje adı boş olamaz.");
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return new GenericApiResponse(false, "Compose dosya içeriği boş olamaz.");
        }

        // Sözcüksel (Lexical) doğrulama: YAML içerisinde TAB yasağı kontrolü
        string[] lines = request.Content.Split('\n');
        for (int i = 0; i < lines.Length; i++)
        {
            string line = lines[i];
            if (line.StartsWith('\t') || line.TrimStart().StartsWith('\t'))
            {
                return new GenericApiResponse(false, $"Sözdizimi hatası: Satır {i + 1} sekme karakteri (TAB) içeriyor. YAML standardında girintileme için boşluk (space) kullanılmalıdır.");
            }
        }

        string? resolvedFilePath = await ResolveComposeFilePathAsync(projectName, cancellationToken);
        if (string.IsNullOrWhiteSpace(resolvedFilePath))
        {
            return new GenericApiResponse(false, $"'{projectName}' projesine ait compose dosyası yolu çözülemedi.");
        }

        try
        {
            // 1. Güvenlik ve varlık kontrolü
            if (!File.Exists(resolvedFilePath))
            {
                return new GenericApiResponse(false, $"Hedef compose dosyası diskte bulunamadı: {resolvedFilePath}");
            }

            // 2. Güvenli yedek (.bak) oluşturma
            string backupPath = $"{resolvedFilePath}.bak";
            File.Copy(resolvedFilePath, backupPath, overwrite: true);
            _logger.LogInformation("Compose dosyası yedeği alındı: {BackupPath}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(backupPath));

            // 3. Dosyayı güvenle kaydet
            await File.WriteAllTextAsync(resolvedFilePath, request.Content, Encoding.UTF8, cancellationToken);
            _logger.LogInformation("Compose dosyası başarıyla güncellendi: {Path}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(resolvedFilePath));

            // 3b. Varsa .env dosyasını güvenle kaydet
            if (request.EnvContent != null)
            {
                string dir = Path.GetDirectoryName(resolvedFilePath) ?? "";
                string envPath = Path.Combine(dir, ".env");
                if (File.Exists(envPath))
                {
                    File.Copy(envPath, $"{envPath}.bak", overwrite: true);
                }
                await File.WriteAllTextAsync(envPath, request.EnvContent, Encoding.UTF8, cancellationToken);
                _logger.LogInformation(".env dosyası kaydedildi: {EnvPath}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(envPath));
            }

            // 4. İsteğe bağlı Stack Container'larını yeniden başlatma
            if (request.RestartStack)
            {
                var containers = await _dockerService.GetContainersAsync(cancellationToken);
                var projectContainers = containers.Where(c => 
                    c.Labels != null && 
                    c.Labels.TryGetValue("com.docker.compose.project", out var proj) &&
                    string.Equals(proj, projectName, StringComparison.OrdinalIgnoreCase)
                ).ToList();

                int restartedCount = 0;
                foreach (var container in projectContainers)
                {
                    var res = await _dockerService.RestartContainerAsync(container.Id, cancellationToken);
                    if (res.Success) restartedCount++;
                }

                _dockerService.InvalidateContainersCache();
                return new GenericApiResponse(true, $"Compose dosyası kaydedildi (.bak yedeği alındı) ve {restartedCount} konteyner yeniden başlatıldı.");
            }

            return new GenericApiResponse(true, "Compose dosyası başarıyla kaydedildi (.bak yedeği oluşturuldu).");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Compose dosyası kaydedilirken hata oluştu: {Project}", Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(projectName));
            return new GenericApiResponse(false, $"Dosya kaydedilemedi: {ex.Message}");
        }
    }

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
