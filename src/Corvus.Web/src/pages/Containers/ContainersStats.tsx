import React from 'react';
import { KpiRow } from '../../components/ui/KpiRow';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusDot } from '../../components/ui/StatusDot';
import type { DockerContainer } from '../../types';
import { useI18n } from '../../i18n';

export interface ContainersStatsProps {
  containers: DockerContainer[];
  selectedState?: string | null;
  onFilterState?: (state: string | null) => void;
}

export const ContainersStats: React.FC<ContainersStatsProps> = ({
  containers,
  selectedState,
  onFilterState,
}) => {
  const { t } = useI18n();
  const list = Array.isArray(containers) ? containers : [];
  const total = list.length;
  const running = list.filter((c) => (c?.State || '').toLowerCase() === 'running').length;
  const paused = list.filter((c) => (c?.State || '').toLowerCase() === 'paused').length;
  const stopped = list.filter((c) => ['exited', 'dead', 'created'].includes((c?.State || '').toLowerCase())).length;

  return (
    <KpiRow className="mb-4">
      <KpiCard
        label={t('containers.kpiTotalContainers')}
        value={total}
        subtext={t('containers.kpiTotalSubtext', { running, stopped })}
        onClick={() => onFilterState?.(null)}
        className={selectedState === null ? 'border-[var(--cloud-400)]' : ''}
      />

      <KpiCard
        label={t('containers.kpiRunningLabel')}
        meta={<StatusDot status="up" />}
        value={running}
        subtext={t('containers.kpiRunningSubtext')}
        onClick={() => onFilterState?.('running')}
        className={selectedState === 'running' ? 'border-[var(--status-up)]' : ''}
      />

      <KpiCard
        label={t('containers.kpiPausedLabel')}
        meta={<StatusDot status="warn" />}
        value={paused}
        subtext={t('containers.kpiPausedSubtext')}
        onClick={() => onFilterState?.('paused')}
        className={selectedState === 'paused' ? 'border-[var(--status-warn)]' : ''}
      />

      <KpiCard
        label={t('containers.kpiStoppedLabel')}
        meta={<StatusDot status="muted" />}
        value={stopped}
        subtext={t('containers.kpiStoppedSubtext')}
        onClick={() => onFilterState?.('stopped')}
        className={selectedState === 'stopped' ? 'border-[var(--status-down)]' : ''}
      />
    </KpiRow>
  );
};

