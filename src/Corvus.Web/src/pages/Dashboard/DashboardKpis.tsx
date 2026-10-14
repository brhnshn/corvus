import React from 'react';
import { HardDrive } from 'lucide-react';
import { KpiRow } from '../../components/ui/KpiRow';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusDot } from '../../components/ui/StatusDot';
import { AnimatedBar } from '../../components/ui/AnimatedBar';
import { Card } from '../../components/ui/Card';
import { useI18n } from '../../i18n';
import type { DashboardSummary, SystemMetric } from '../../types';

export interface DashboardKpisProps {
  summary: DashboardSummary | null;
  metrics?: SystemMetric;
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings') => void;
}

export const DashboardKpis: React.FC<DashboardKpisProps> = ({
  summary,
  metrics,
  onNavigate,
}) => {
  const { t } = useI18n();

  const totalServices = summary?.totalServices ?? 0;
  const healthyServices = summary?.healthyServices ?? 0;
  const servicesRatio = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 100;

  const totalContainers = summary?.totalContainers ?? 0;
  const runningContainers = summary?.runningContainers ?? 0;
  const containersRatio = totalContainers > 0 ? Math.round((runningContainers / totalContainers) * 100) : 100;

  const hasCpu = typeof metrics?.cpuPercent === 'number';
  const cpuPercent = hasCpu ? Math.round(metrics!.cpuPercent) : null;

  const ramUsedMb = typeof metrics?.ramUsedMb === 'number' ? metrics.ramUsedMb : null;
  const ramTotalMb = typeof metrics?.ramTotalMb === 'number' && metrics.ramTotalMb > 0 ? metrics.ramTotalMb : null;
  const ramRatio = ramUsedMb !== null && ramTotalMb !== null ? Math.round((ramUsedMb / ramTotalMb) * 100) : null;
  const ramUsedGb = ramUsedMb !== null ? (ramUsedMb / 1024).toFixed(1) : null;
  const ramTotalGb = ramTotalMb !== null ? (ramTotalMb / 1024).toFixed(1) : null;

  const diskUsedGb = typeof metrics?.diskUsedGb === 'number' ? metrics.diskUsedGb : null;
  const diskTotalGb = typeof metrics?.diskTotalGb === 'number' && metrics.diskTotalGb > 0 ? metrics.diskTotalGb : null;
  const diskFreeGb = diskUsedGb !== null && diskTotalGb !== null ? Math.max(0, diskTotalGb - diskUsedGb) : null;
  const diskPercent = diskUsedGb !== null && diskTotalGb !== null ? Math.round((diskUsedGb / diskTotalGb) * 100) : null;

  return (
    <div className="space-y-3">
      {/* 4'lü ObsidianUI KPI Izgarası */}
      <KpiRow>
        <KpiCard
          label={t('nav.services')}
          meta={<StatusDot status={servicesRatio === 100 ? 'up' : servicesRatio >= 75 ? 'warn' : 'down'} />}
          value={`${healthyServices} / ${totalServices}`}
          subtext={`${healthyServices} ${t('dashboard.statusHealthy').toLowerCase()}, ${totalServices - healthyServices} ${t('dashboard.statusDown').toLowerCase()}`}
          onClick={() => onNavigate?.('services')}
        />

        <KpiCard
          label={t('nav.containers')}
          meta={<StatusDot status={containersRatio === 100 ? 'up' : containersRatio >= 75 ? 'warn' : 'down'} />}
          value={`${runningContainers} / ${totalContainers}`}
          subtext={`${runningContainers} ${t('status.running').toLowerCase()}, ${totalContainers - runningContainers} ${t('status.stopped').toLowerCase()}`}
          onClick={() => onNavigate?.('containers')}
        />

        <KpiCard
          label={t('dashboard.cpuLoad')}
          meta={cpuPercent !== null ? (
            <span className="badge text-[10px]">
              {cpuPercent > 80 ? t('dashboard.cpuHigh') : t('dashboard.cpuNormal')}
            </span>
          ) : undefined}
          value={cpuPercent !== null ? cpuPercent : '-'}
          prefix={cpuPercent !== null ? '%' : ''}
          decimals={0}
          barPercentage={cpuPercent !== null ? cpuPercent : 0}
          barColor={cpuPercent !== null && cpuPercent > 80 ? 'var(--status-down)' : cpuPercent !== null && cpuPercent > 60 ? 'var(--status-warn)' : 'var(--cloud-200)'}
          subtext={t('dashboard.cpuInstant')}
          onClick={() => onNavigate?.('metrics')}
        />

        <KpiCard
          label={t('dashboard.ramConsumption')}
          meta={ramRatio !== null ? <span className="badge text-[10px]">%{ramRatio}</span> : undefined}
          value={ramUsedGb !== null ? parseFloat(ramUsedGb) : '-'}
          decimals={1}
          suffix={ramTotalGb !== null ? ` / ${ramTotalGb} GB` : ''}
          barPercentage={ramRatio !== null ? ramRatio : 0}
          barColor={ramRatio !== null && ramRatio > 85 ? 'var(--status-down)' : ramRatio !== null && ramRatio > 70 ? 'var(--status-warn)' : 'var(--cloud-200)'}
          subtext={t('dashboard.ramUsedTotal')}
          onClick={() => onNavigate?.('metrics')}
        />
      </KpiRow>

      {/* Disk Durumu İnce Kartı */}
      <Card
        onClick={() => onNavigate?.('metrics')}
        className="cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--cloud-200)] shrink-0">
            <HardDrive className="w-4 h-4" />
          </span>
          <div className="flex items-baseline gap-2 min-w-0">
            <b className="text-[13.5px] font-semibold text-[var(--cloud-100)]">{t('dashboard.diskRoot')}</b>
            <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
              ({diskFreeGb !== null ? t('dashboard.diskFreeSuffix', { gb: diskFreeGb }) : '-'})
            </span>
          </div>
          <div className="ml-auto text-right leading-tight">
            <span className="text-[16px] font-mono font-bold tabular-nums text-[var(--cloud-100)]">
              {diskPercent !== null ? `%${diskPercent}` : '-'}
            </span>
            <span className="block font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
              {diskUsedGb !== null && diskTotalGb !== null ? `${diskUsedGb} / ${diskTotalGb} GB` : '-'}
            </span>
          </div>
        </div>
        <div className="mt-3">
          <AnimatedBar
            percentage={diskPercent !== null ? diskPercent : 0}
            color={diskPercent !== null && diskPercent > 85 ? 'var(--status-down)' : diskPercent !== null && diskPercent > 70 ? 'var(--status-warn)' : 'var(--cloud-200)'}
          />
        </div>
      </Card>
    </div>
  );
};

