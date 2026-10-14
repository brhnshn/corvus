import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TableWrap } from '../../components/ui/ExpandableTable';
import { formatBytes } from '../../utils/format';
import type { DockerContainer, ContainerStats } from '../../types';

export interface TopResourcesCardProps {
  containers: DockerContainer[];
  statsMap?: Record<string, ContainerStats>;
  onNavigate?: (page: 'containers') => void;
}

export const TopResourcesCard: React.FC<TopResourcesCardProps> = ({
  containers,
  statsMap = {},
  onNavigate,
}) => {
  // Konteynerleri RAM kullanımına göre sırala
  const containerListWithStats = containers.map((c) => {
    const cleanName = (c.Names?.[0] || c.Id).replace(/^\//, '');
    const stat = statsMap[c.Id];
    const ramBytes = stat?.memoryUsageBytes ?? 0;
    const ramPercent = stat?.memoryPercent ?? 0;
    const cpuPercent = stat?.cpuPercent ?? 0;
    return {
      id: c.Id,
      name: cleanName,
      ramBytes,
      ramPercent,
      cpuPercent,
    };
  });

  // RAM'e göre azalan sırala, ilk 5'i al
  const topContainers = containerListWithStats
    .sort((a, b) => b.ramBytes - a.ramBytes)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader
        action={
          onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('containers')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--cloud-100)] transition-colors cursor-pointer"
            >
              Tümünü Gör →
            </button>
          )
        }
      >
        <CardTitle>En Çok Kaynak Tüketen Konteynerler</CardTitle>
      </CardHeader>
      <CardContent className="!p-0">
        {topContainers.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)]">
            Henüz kaynak istatistiği toplanmadı
          </div>
        ) : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>Konteyner</th>
                  <th>CPU</th>
                  <th>Bellek</th>
                  <th style={{ textAlign: 'right' }}>Bellek Oranı</th>
                </tr>
              </thead>
              <tbody>
                {topContainers.map((item) => (
                  <tr
                    key={item.id}
                    className="data-row cursor-pointer"
                    onClick={() => onNavigate?.('containers')}
                  >
                    <td className="font-mono text-xs font-medium text-[var(--cloud-100)]">
                      {item.name}
                    </td>
                    <td className="font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                      {item.cpuPercent ? `%${item.cpuPercent.toFixed(1)}` : '-'}
                    </td>
                    <td className="font-mono text-xs tabular-nums text-[var(--cloud-200)]">
                      {item.ramBytes > 0 ? formatBytes(item.ramBytes) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                      {item.ramPercent ? `%${item.ramPercent.toFixed(1)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </CardContent>
    </Card>
  );
};

