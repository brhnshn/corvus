import React from 'react';
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
  const total = services.length;
  const healthy = services.filter((s) => s.status === 'healthy').length;
  const degraded = services.filter((s) => s.status === 'degraded').length;
  const down = services.filter((s) => s.status === 'down').length;

  return (
    <KpiRow className="mb-4">
      <KpiCard
        label="Toplam Servis"
        value={total}
        subtext={`${healthy} aktif, ${down} kesinti`}
        onClick={() => onFilterStatus?.(null)}
        className={selectedStatus === null ? 'border-[var(--cloud-400)]' : ''}
      />

      <KpiCard
        label="Çevrimiçi (Up)"
        meta={<StatusDot status="up" />}
        value={healthy}
        subtext="HTTP & TCP port aktif"
        onClick={() => onFilterStatus?.('healthy')}
        className={selectedStatus === 'healthy' ? 'border-[var(--status-up)]' : ''}
      />

      <KpiCard
        label="Performans Düşüşü"
        meta={<StatusDot status="warn" />}
        value={degraded}
        subtext="Yüksek yanıt süresi"
        onClick={() => onFilterStatus?.('degraded')}
        className={selectedStatus === 'degraded' ? 'border-[var(--status-warn)]' : ''}
      />

      <KpiCard
        label="Erişilemiyor (Down)"
        meta={<StatusDot status="down" />}
        value={down}
        subtext="Acil müdahale bekliyor"
        onClick={() => onFilterStatus?.('down')}
        className={selectedStatus === 'down' ? 'border-[var(--status-down)]' : ''}
      />
    </KpiRow>
  );
};

