using System.Text;
using Corvus.Api.Models;

namespace Corvus.Api.Services;

public interface IComposeFileService
{
    Task<ComposeFileDto> GetComposeFileAsync(string projectName, CancellationToken cancellationToken = default);
    Task<GenericApiResponse> SaveComposeFileAsync(string projectName, SaveComposeFileRequest request, CancellationToken cancellationToken = default);
    Task<ComposeDeployResult> DeployComposeAsync(string projectName, CancellationToken cancellationToken = default);
}

public partial class ComposeFileService : IComposeFileService
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
}
