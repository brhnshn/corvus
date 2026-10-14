using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Corvus.Api.Models;
using Corvus.Api.Models.Systems;

namespace Corvus.Api.Services.Systems;

public interface ISystemdServiceClient
{
    Task<List<SystemdUnitDto>> ListUnitsAsync(CancellationToken ct = default);
    Task<GenericApiResponse> ControlUnitAsync(string unitName, string action, CancellationToken ct = default);
    Task<SystemdLogsDto> GetUnitLogsAsync(string unitName, int lines = 100, CancellationToken ct = default);
}

public class SystemdServiceClient : ISystemdServiceClient
{
    private static readonly Regex UnitNameRegex = new(@"^[a-zA-Z0-9@_.-]+\.service$", RegexOptions.Compiled);
    private readonly ILogger<SystemdServiceClient> _logger;

    public SystemdServiceClient(ILogger<SystemdServiceClient> logger)
    {
        _logger = logger;
    }

    public static bool IsValidUnitName(string? unitName)
    {
        if (string.IsNullOrWhiteSpace(unitName)) return false;
        return UnitNameRegex.IsMatch(unitName.Trim());
    }

    public async Task<List<SystemdUnitDto>> ListUnitsAsync(CancellationToken ct = default)
    {
        if (!OperatingSystem.IsLinux())
        {
            _logger.LogDebug("SystemdServiceClient: Linux harici işletim sistemi tespit edildi, boş liste dönülüyor.");
            return [];
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "systemctl",
                Arguments = "list-units --type=service --output=json",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var proc = Process.Start(psi);
            if (proc == null) return [];

            string jsonOutput = await proc.StandardOutput.ReadToEndAsync(ct);
            await proc.WaitForExitAsync(ct);

            if (proc.ExitCode != 0 || string.IsNullOrWhiteSpace(jsonOutput))
            {
                return [];
            }

            var results = new List<SystemdUnitDto>();
            using var doc = JsonDocument.Parse(jsonOutput);

            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    string unit = el.TryGetProperty("unit", out var u) ? (u.GetString() ?? "") : "";
                    string desc = el.TryGetProperty("description", out var d) ? (d.GetString() ?? "") : "";
                    string load = el.TryGetProperty("load", out var l) ? (l.GetString() ?? "") : "";
                    string active = el.TryGetProperty("active", out var a) ? (a.GetString() ?? "") : "";
                    string sub = el.TryGetProperty("sub", out var s) ? (s.GetString() ?? "") : "";

                    if (string.IsNullOrWhiteSpace(unit)) continue;

                    results.Add(new SystemdUnitDto
                    {
                        Name = unit,
                        Description = desc,
                        LoadState = load,
                        ActiveState = active,
                        SubState = sub
                    });
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "systemctl list-units komutu çalıştırılamadı.");
            return [];
        }
    }

    public async Task<GenericApiResponse> ControlUnitAsync(string unitName, string action, CancellationToken ct = default)
    {
        string trimmedName = (unitName ?? "").Trim();
        if (!IsValidUnitName(trimmedName))
        {
            _logger.LogWarning("Geçersiz birim adı engellendi (Command Injection koruması): {Unit}", 
                Corvus.Api.Utils.SecuritySanitizer.SanitizeLog(unitName));
            return new GenericApiResponse(false, "Geçersiz birim adı. Birim adı '^[a-zA-Z0-9@_.-]+\\.service$' kuralına uymalıdır.");
        }

        string normAction = (action ?? "").Trim().ToLowerInvariant();
        if (normAction is not ("start" or "stop" or "restart"))
        {
            return new GenericApiResponse(false, $"Geçersiz eylem: {action}. İzin verilen eylemler: start, stop, restart.");
        }

        if (!OperatingSystem.IsLinux())
        {
            return new GenericApiResponse(false, "Systemd yönetimi yalnızca Linux ana makinelerinde desteklenir.");
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "systemctl",
                Arguments = $"{normAction} \"{trimmedName}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var proc = Process.Start(psi);
            if (proc == null)
            {
                return new GenericApiResponse(false, "systemctl işlemi başlatılamadı.");
            }

            string errOut = await proc.StandardError.ReadToEndAsync(ct);
            await proc.WaitForExitAsync(ct);

            if (proc.ExitCode == 0)
            {
                return new GenericApiResponse(true, $"{trimmedName} servisi '{normAction}' eylemi başarıyla uygulandı.");
            }

            return new GenericApiResponse(false, string.IsNullOrWhiteSpace(errOut) 
                ? $"systemctl exit code: {proc.ExitCode}" 
                : errOut.Trim());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "systemctl eylemi yürütülürken hata: {Unit} - {Action}", trimmedName, normAction);
            return new GenericApiResponse(false, $"Hata: {ex.Message}");
        }
    }

    public async Task<SystemdLogsDto> GetUnitLogsAsync(string unitName, int lines = 100, CancellationToken ct = default)
    {
        string trimmedName = (unitName ?? "").Trim();
        if (!IsValidUnitName(trimmedName))
        {
            return new SystemdLogsDto
            {
                Unit = unitName ?? "",
                Logs = ["Geçersiz birim adı. '^[a-zA-Z0-9@_.-]+\\.service$' formatında olmalıdır."]
            };
        }

        int clampedLines = Math.Clamp(lines, 1, 1000);

        if (!OperatingSystem.IsLinux())
        {
            return new SystemdLogsDto
            {
                Unit = trimmedName,
                Logs = ["Systemd günlükleri (journalctl) yalnızca Linux ana makinelerinde görüntülenebilir."]
            };
        }

        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "journalctl",
                Arguments = $"-u \"{trimmedName}\" -n {clampedLines} --no-pager",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var proc = Process.Start(psi);
            if (proc == null)
            {
                return new SystemdLogsDto { Unit = trimmedName, Logs = ["journalctl başlatılamadı."] };
            }

            string stdOut = await proc.StandardOutput.ReadToEndAsync(ct);
            await proc.WaitForExitAsync(ct);

            var logLines = stdOut.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                .Select(l => l.TrimEnd())
                .ToList();

            return new SystemdLogsDto
            {
                Unit = trimmedName,
                Logs = logLines
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "journalctl günlükleri alınırken hata: {Unit}", trimmedName);
            return new SystemdLogsDto
            {
                Unit = trimmedName,
                Logs = [$"Günlükler okunamadı: {ex.Message}"]
            };
        }
    }
}
