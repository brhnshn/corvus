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

  const cpuPercent = Math.round(metrics?.cpuPercent ?? 0);
  const ramUsedMb = metrics?.ramUsedMb ?? 0;
  const ramTotalMb = metrics?.ramTotalMb ?? 1;
  const ramRatio = Math.round((ramUsedMb / (ramTotalMb || 1)) * 100);
  const ramUsedGb = (ramUsedMb / 1024).toFixed(1);
  const ramTotalGb = (ramTotalMb / 1024).toFixed(1);

  const diskUsedGb = metrics?.diskUsedGb ?? 0;
  const diskTotalGb = metrics?.diskTotalGb ?? 1;
  const diskFreeGb = Math.max(0, diskTotalGb - diskUsedGb);
  const diskPercent = diskTotalGb > 0 ? Math.round((diskUsedGb / diskTotalGb) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* 4'lü ObsidianUI KPI Izgarası */}
      <KpiRow>
        <KpiCard
          label={t('nav.services')}
          meta={<StatusDot status={servicesRatio === 100 ? 'up' : servicesRatio >= 75 ? 'warn' : 'down'} />}
          value={`${healthyServices} / ${totalServices}`}
          subtext={`${healthyServices} aktif, ${totalServices - healthyServices} sorunlu`}
          onClick={() => onNavigate?.('services')}
        />

        <KpiCard
          label={t('nav.containers')}
          meta={<StatusDot status={containersRatio === 100 ? 'up' : containersRatio >= 75 ? 'warn' : 'down'} />}
          value={`${runningContainers} / ${totalContainers}`}
          subtext={`${runningContainers} aktif, ${totalContainers - runningContainers} durdu`}
          onClick={() => onNavigate?.('containers')}
        />

        <KpiCard
          label="Sistem CPU Yükü"
          meta={<span className="badge text-[10px]">{cpuPercent > 80 ? 'Yüksek' : 'Normal'}</span>}
          value={cpuPercent}
          prefix="%"
          decimals={0}
          barPercentage={cpuPercent}
          barColor={cpuPercent > 80 ? 'var(--status-down)' : cpuPercent > 60 ? 'var(--status-warn)' : 'var(--cloud-200)'}
          subtext="Anlık işlemci tüketimi"
          onClick={() => onNavigate?.('metrics')}
        />

        <KpiCard
          label="RAM Tüketimi"
          meta={<span className="badge text-[10px]">%{ramRatio}</span>}
          value={parseFloat(ramUsedGb)}
          decimals={1}
          suffix={` / ${ramTotalGb} GB`}
          barPercentage={ramRatio}
          barColor={ramRatio > 85 ? 'var(--status-down)' : ramRatio > 70 ? 'var(--status-warn)' : 'var(--cloud-200)'}
          subtext="Kullanılan / Toplam bellek"
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
            <b className="text-[13.5px] font-semibold text-[var(--cloud-100)]">Disk Durumu (Root)</b>
            <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
              ({diskFreeGb} GB Boş)
            </span>
          </div>
          <div className="ml-auto text-right leading-tight">
            <span className="text-[16px] font-mono font-bold tabular-nums text-[var(--cloud-100)]">
              %{diskPercent}
            </span>
            <span className="block font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
              {diskUsedGb} / {diskTotalGb} GB
            </span>
          </div>
        </div>
        <div className="mt-3">
          <AnimatedBar
            percentage={diskPercent}
            color={diskPercent > 85 ? 'var(--status-down)' : diskPercent > 70 ? 'var(--status-warn)' : 'var(--cloud-200)'}
          />
        </div>
      </Card>
    </div>
  );
};

