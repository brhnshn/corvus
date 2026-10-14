import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { TableWrap } from '../../components/ui/ExpandableTable';
import { formatBytes } from '../../utils/format';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();

  // Konteynerleri RAM kullanımına göre sırala
  const containerListWithStats = containers.map((c) => {
    const cleanName = (c.Names?.[0] || c.Id).replace(/^\//, '');
    const stat = statsMap[c.Id];
    const ramBytes = typeof stat?.memoryUsageBytes === 'number' ? stat.memoryUsageBytes : 0;
    const ramPercent = typeof stat?.memoryPercent === 'number' ? stat.memoryPercent : null;
    const cpuPercent = typeof stat?.cpuPercent === 'number' ? stat.cpuPercent : null;
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
              {t('dashboard.viewAll')}
            </button>
          )
        }
      >
        <CardTitle>{t('dashboard.topResourceContainers')}</CardTitle>
      </CardHeader>
      <CardContent className="!p-0">
        {topContainers.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)]">
            {t('dashboard.noResourceStats')}
          </div>
        ) : (
          <TableWrap>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('dashboard.topContainer')}</th>
                  <th>{t('dashboard.topCpu')}</th>
                  <th>{t('dashboard.topRam')}</th>
                  <th style={{ textAlign: 'right' }}>{t('dashboard.topRamRatio')}</th>
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
                      {typeof item.cpuPercent === 'number' ? `%${item.cpuPercent.toFixed(1)}` : '-'}
                    </td>
                    <td className="font-mono text-xs tabular-nums text-[var(--cloud-200)]">
                      {item.ramBytes > 0 ? formatBytes(item.ramBytes) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
                      {typeof item.ramPercent === 'number' ? `%${item.ramPercent.toFixed(1)}` : '-'}
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

