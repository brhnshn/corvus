using Dapper;
using Corvus.Api.Models;
using Microsoft.Data.Sqlite;

namespace Corvus.Api.Data;

// Konteyner yeniden oluşturulunca (Watchtower güncellemesi, compose up) ID değişir; service_overrides ise
// container_id ve service_id (docker_<ilk12>) ile anahtarlıdır. Bu adım sahipsiz kalan kullanıcı ayarını
// aynı adlı yeni konteynere taşır.
public partial class ServicesRepository
{
    private sealed record OrphanOverride(string ContainerId, string? ServiceId, string RawName, string NormalizedName);

    // Geri bağlanan her ayar için (eski servis ID, yeni servis ID); geçmiş bu çiftlerle taşınır
    private static async Task<List<(string OldServiceId, string NewServiceId)>> RebindOrphanedOverridesAsync(
        SqliteConnection conn,
        SqliteTransaction tx,
        List<Service> services,
        List<string> activeContainerIds,
        string targetSystemId)
    {
        var moved = new List<(string OldServiceId, string NewServiceId)>();
        if (services.Count == 0) return moved;

        var orphans = await LoadOrphanOverridesAsync(conn, tx, activeContainerIds, targetSystemId);
        if (orphans.Count == 0) return moved;

        foreach (var s in services)
        {
            if (string.IsNullOrEmpty(s.ContainerId) || string.IsNullOrWhiteSpace(s.Name)) continue;

            long existing = await conn.ExecuteScalarAsync<long>(
                "SELECT COUNT(*) FROM service_overrides WHERE container_id = @ContainerId OR service_id = @Id",
                new { s.ContainerId, s.Id }, tx);
            if (existing > 0) continue;

            string normalized = NormalizeContainerName(s.Name);
            var match = orphans.FirstOrDefault(o => string.Equals(o.RawName, s.Name, StringComparison.OrdinalIgnoreCase))
                        ?? orphans.FirstOrDefault(o => o.NormalizedName == normalized);
            if (match == null) continue;

            await conn.ExecuteAsync(
                "UPDATE service_overrides SET container_id = @NewContainerId, service_id = @NewServiceId WHERE container_id = @OldContainerId",
                new { NewContainerId = s.ContainerId, NewServiceId = s.Id, OldContainerId = match.ContainerId }, tx);
            orphans.Remove(match);

            string oldServiceId = !string.IsNullOrEmpty(match.ServiceId)
                ? match.ServiceId
                : $"docker_{match.ContainerId[..Math.Min(12, match.ContainerId.Length)]}";
            if (oldServiceId != s.Id)
            {
                moved.Add((oldServiceId, s.Id));
            }
        }
        return moved;
    }

    // Eski servis satırı silinince uptime_checks ON DELETE CASCADE ile gider, günlük istatistikler sahipsiz kalır.
    // Yeni satır eklendikten sonra, eski satır silinmeden önce çağrılmalı.
    private static async Task MoveUptimeHistoryAsync(
        SqliteConnection conn, SqliteTransaction tx, List<(string OldServiceId, string NewServiceId)> moved)
    {
        foreach (var (oldId, newId) in moved)
        {
            await conn.ExecuteAsync(
                "UPDATE uptime_checks SET service_id = @newId WHERE service_id = @oldId",
                new { oldId, newId }, tx);
            await conn.ExecuteAsync(
                "UPDATE OR IGNORE uptime_daily_stats SET service_id = @newId WHERE service_id = @oldId",
                new { oldId, newId }, tx);
        }
    }

    // Konteyneri artık çalışmayan ve başka bir düğümün servis satırına bağlı olmayan override'lar
    private static async Task<List<OrphanOverride>> LoadOrphanOverridesAsync(
        SqliteConnection conn, SqliteTransaction tx, List<string> activeContainerIds, string targetSystemId)
    {
        using var cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
            SELECT o.container_id, COALESCE(o.container_name, o.name), o.service_id
            FROM service_overrides o
            WHERE COALESCE(o.container_name, o.name) IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM services s
                  WHERE (s.container_id = o.container_id OR s.id = o.service_id)
                    AND NOT (s.system_id = @targetSystemId
                             OR (@targetSystemId = 'local-host' AND (s.system_id IS NULL OR s.system_id = ''))))
            ORDER BY o.rowid DESC";
        cmd.Parameters.AddWithValue("@targetSystemId", targetSystemId);

        var active = new HashSet<string>(activeContainerIds, StringComparer.OrdinalIgnoreCase);
        var list = new List<OrphanOverride>();
        using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            string containerId = reader.GetString(0);
            if (active.Contains(containerId)) continue;
            string rawName = reader.GetString(1);
            string? serviceId = reader.IsDBNull(2) ? null : reader.GetString(2);
            list.Add(new OrphanOverride(containerId, serviceId, rawName, NormalizeContainerName(rawName)));
        }
        return list;
    }

    // compose yeniden oluştururken konteynere geçici olarak "<eski ID ilk 12>_<ad>" adını verir
    internal static string NormalizeContainerName(string name)
    {
        string n = name.Trim().TrimStart('/');
        if (n.Length > 13 && n[12] == '_' && n.AsSpan(0, 12).IndexOfAnyExcept("0123456789abcdefABCDEF") < 0)
        {
            n = n[13..];
        }
        return n.ToLowerInvariant();
    }
}
