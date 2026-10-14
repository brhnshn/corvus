import React from 'react';
import { KpiRow } from '../../components/ui/KpiRow';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusDot } from '../../components/ui/StatusDot';
import type { DockerContainer } from '../../types';

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
  const list = Array.isArray(containers) ? containers : [];
  const total = list.length;
  const running = list.filter((c) => (c?.State || '').toLowerCase() === 'running').length;
  const paused = list.filter((c) => (c?.State || '').toLowerCase() === 'paused').length;
  const stopped = list.filter((c) => ['exited', 'dead', 'created'].includes((c?.State || '').toLowerCase())).length;

  return (
    <KpiRow className="mb-4">
      <KpiCard
        label="Toplam Konteyner"
        value={total}
        subtext={`${running} aktif, ${stopped} kapalı`}
        onClick={() => onFilterState?.(null)}
        className={selectedState === null ? 'border-[var(--cloud-400)]' : ''}
      />

      <KpiCard
        label="Çalışıyor (Running)"
        meta={<StatusDot status="up" />}
        value={running}
        subtext="Sorunsuz çalışıyor"
        onClick={() => onFilterState?.('running')}
        className={selectedState === 'running' ? 'border-[var(--status-up)]' : ''}
      />

      <KpiCard
        label="Duraklatıldı (Paused)"
        meta={<StatusDot status="warn" />}
        value={paused}
        subtext="Beklemede"
        onClick={() => onFilterState?.('paused')}
        className={selectedState === 'paused' ? 'border-[var(--status-warn)]' : ''}
      />

      <KpiCard
        label="Durduruldu (Stopped)"
        meta={<StatusDot status="muted" />}
        value={stopped}
        subtext="Kapalı konteynerler"
        onClick={() => onFilterState?.('stopped')}
        className={selectedState === 'stopped' ? 'border-[var(--status-down)]' : ''}
      />
    </KpiRow>
  );
};

