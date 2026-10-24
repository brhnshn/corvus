import React from 'react';
import { useI18n } from '../../i18n';
import { KpiRow } from '../../components/ui/KpiRow';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusDot } from '../../components/ui/StatusDot';
import type { Service } from '../../types';

export interface ServicesStatsProps {
  services: Service[];
  onFilterStatus?: (status: string | null) => void;
  selectedStatus?: string | null;
}

export const ServicesStats: React.FC<ServicesStatsProps> = ({
  services,
  onFilterStatus,
  selectedStatus,
}) => {
  const { t } = useI18n();
  const total = services.length;
  const healthy = services.filter((s) => s.status === 'healthy').length;
  const degraded = services.filter((s) => s.status === 'degraded').length;
  const down = services.filter((s) => s.status === 'down').length;

  return (
    <KpiRow className="mb-4">
      <KpiCard
        label={t('services.statTotalServices')}
        value={total}
        decimals={0}
        subtext={t('services.statActiveOutage', { active: healthy, outage: down })}
        onClick={() => onFilterStatus?.(null)}
        className={selectedStatus === null ? 'border-[var(--cloud-400)]' : ''}
      />

      <KpiCard
        label={t('services.statOnline')}
        meta={<StatusDot status="up" />}
        value={healthy}
        decimals={0}
        subtext={t('services.statOnlineSubtext')}
        onClick={() => onFilterStatus?.('healthy')}
        className={selectedStatus === 'healthy' ? 'border-[var(--status-up)]' : ''}
      />

      <KpiCard
        label={t('services.statDegraded')}
        meta={<StatusDot status="warn" />}
        value={degraded}
        decimals={0}
        subtext={t('services.statDegradedSubtext')}
        onClick={() => onFilterStatus?.('degraded')}
        className={selectedStatus === 'degraded' ? 'border-[var(--status-warn)]' : ''}
      />

      <KpiCard
        label={t('services.statDown')}
        meta={<StatusDot status="down" />}
        value={down}
        decimals={0}
        subtext={t('services.statDownSubtext')}
        onClick={() => onFilterStatus?.('down')}
        className={selectedStatus === 'down' ? 'border-[var(--status-down)]' : ''}
      />
    </KpiRow>
  );
};

