import React from 'react';
import { Server, Boxes, Cpu, HardDrive } from 'lucide-react';
import { StatTile } from '../../components/ui/StatTile';
import { ProgressBar } from '../../components/ui/ProgressBar';
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
    <div className="space-y-2.5 sm:space-y-3 animate-rv" style={{ animationDelay: '120ms' }}>
      {/* 4'lü StatTile Izgarası */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
        <StatTile
          label={t('nav.services')}
          value={`${healthyServices}/${totalServices}`}
          unit="aktif"
          icon={<Server className="w-4 h-4" />}
          progress={servicesRatio}
          variant={servicesRatio === 100 ? 'ok' : servicesRatio >= 75 ? 'warn' : 'err'}
          onClick={() => onNavigate?.('services')}
        />

        <StatTile
          label={t('nav.containers')}
          value={`${runningContainers}/${totalContainers}`}
          unit="çalışıyor"
          icon={<Boxes className="w-4 h-4" />}
          progress={containersRatio}
          variant={containersRatio === 100 ? 'ok' : containersRatio >= 75 ? 'warn' : 'err'}
          onClick={() => onNavigate?.('containers')}
        />

        <StatTile
          label="CPU Yükü"
          value={`%${cpuPercent}`}
          unit="anlık"
          icon={<Cpu className="w-4 h-4" />}
          progress={cpuPercent}
          metricType="cpu"
          onClick={() => onNavigate?.('metrics')}
        />

        <StatTile
          label="RAM Kullanımı"
          value={`${ramUsedGb} GB`}
          unit={`/ ${ramTotalGb} GB`}
          icon={<HardDrive className="w-4 h-4" />}
          progress={ramRatio}
          metricType="ram"
          onClick={() => onNavigate?.('metrics')}
        />
      </div>

      {/* Disk Durumu Geniş Kartı */}
      <div
        onClick={() => onNavigate?.('metrics')}
        className="surface rounded-[20px] p-4 flex flex-col gap-2.5 transition-colors duration-250 cursor-pointer hover:bg-white/[0.08]"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[11px] border border-white/10 bg-white/[0.07] flex items-center justify-center text-[#eceef6] shrink-0">
            <HardDrive className="w-4 h-4" />
          </span>
          <div className="flex items-baseline gap-2 min-w-0">
            <b className="text-[15px] font-semibold text-[#eceef6]">Disk Durumu</b>
            <small className="text-xs text-[#9ba0b5] font-mono">({diskFreeGb} GB Boş)</small>
          </div>
          <div className="ml-auto text-right leading-tight">
            <span className="text-[20px] font-bold tracking-[-0.5px] text-[#eceef6]">%{diskPercent}</span>
            <small className="block font-mono text-[11px] text-[#9ba0b5]">{diskUsedGb} / {diskTotalGb} GB</small>
          </div>
        </div>
        <ProgressBar value={diskPercent} metricType="disk" height={6} />
      </div>
    </div>
  );
};
