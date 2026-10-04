import React from 'react';
import { Cpu, HardDrive, Database } from 'lucide-react';
import type { SystemMetric } from '../../api/client';
import { useI18n } from '../../i18n';
import { Pill } from '../../components/ui/Pill';
import { ProgressBar } from '../../components/ui/ProgressBar';

interface SystemKpiCardsProps {
  metrics: SystemMetric[];
  latestMetric?: SystemMetric | null;
}

export const SystemKpiCards: React.FC<SystemKpiCardsProps> = ({ metrics, latestMetric }) => {
  const { t } = useI18n();

  const current = latestMetric || (metrics.length > 0 ? metrics[metrics.length - 1] : null);

  if (!current) return null;

  // CPU istatistikleri
  const cpuValues = metrics.map((m) => m.cpuPercent);
  const minCpu = cpuValues.length > 0 ? Math.min(...cpuValues) : current.cpuPercent;
  const maxCpu = cpuValues.length > 0 ? Math.max(...cpuValues) : current.cpuPercent;
  const avgCpu = cpuValues.length > 0 
    ? Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) 
    : current.cpuPercent;

  // RAM istatistikleri
  const ramUsedGb = +(current.ramUsedMb / 1024).toFixed(1);
  const ramTotalGb = +(current.ramTotalMb / 1024).toFixed(1);
  const ramPercent = current.ramTotalMb > 0 
    ? Math.round((current.ramUsedMb / current.ramTotalMb) * 100) 
    : 0;
  const ramFreeGb = +(ramTotalGb - ramUsedGb).toFixed(1);

  // Disk istatistikleri
  const diskPercent = current.diskTotalGb > 0 
    ? Math.round((current.diskUsedGb / current.diskTotalGb) * 100) 
    : 0;
  const diskFreeGb = Math.max(0, current.diskTotalGb - current.diskUsedGb);

  const getStatus = (percent: number, warn = 70, crit = 90): { status: 'ok' | 'warn' | 'err'; label: string } => {
    if (percent >= crit) return { status: 'err', label: t('metrics.critical') || 'Kritik' };
    if (percent >= warn) return { status: 'warn', label: t('metrics.warning') || 'Yüksek' };
    return { status: 'ok', label: t('metrics.optimal') || 'Normal' };
  };

  const cpuStatus = getStatus(current.cpuPercent, 70, 90);
  const ramStatus = getStatus(ramPercent, 80, 90);
  const diskStatus = getStatus(diskPercent, 80, 90);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
      {/* CPU Kartı */}
      <div className="surface rounded-[22px] p-4 flex flex-col justify-between gap-3 hover:bg-white/[0.1] transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-[38px] h-[38px] rounded-[12px] border border-white/10 bg-white/[0.07] flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-[#eceef6]" />
          </span>
          <div>
            <small className="block text-xs text-[#9ba0b5] font-medium leading-none mb-1">
              {t('metrics.cpuUsage') || 'CPU Kullanımı'}
            </small>
            <b className="text-2xl font-bold tracking-tight text-[#eceef6] leading-none">
              %{current.cpuPercent.toFixed(1)}
            </b>
          </div>
          <div className="ml-auto">
            <Pill status={cpuStatus.status} label={cpuStatus.label} showDot={false} />
          </div>
        </div>

        <div className="space-y-1.5">
          <ProgressBar value={current.cpuPercent} variant={cpuStatus.status} />
          <div className="flex justify-between font-mono text-[11px] text-[#9ba0b5]">
            <span>{t('metrics.minUsage', { value: minCpu.toFixed(1) }) || `Min: %${minCpu.toFixed(1)}`}</span>
            <span>{t('metrics.avgUsage', { value: avgCpu.toFixed(0) }) || `Ort: %${avgCpu.toFixed(0)}`}</span>
            <span>{t('metrics.maxUsage', { value: maxCpu.toFixed(1) }) || `Max: %${maxCpu.toFixed(1)}`}</span>
          </div>
        </div>
      </div>

      {/* RAM Kartı */}
      <div className="surface rounded-[22px] p-4 flex flex-col justify-between gap-3 hover:bg-white/[0.1] transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-[38px] h-[38px] rounded-[12px] border border-white/10 bg-white/[0.07] flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-[#eceef6]" />
          </span>
          <div>
            <small className="block text-xs text-[#9ba0b5] font-medium leading-none mb-1">
              {t('metrics.ramUsage') || 'Bellek (RAM) Kullanımı'}
            </small>
            <b className="text-2xl font-bold tracking-tight text-[#eceef6] leading-none">
              %{ramPercent}
            </b>
          </div>
          <div className="ml-auto">
            <Pill status={ramStatus.status} label={ramStatus.label} showDot={false} />
          </div>
        </div>

        <div className="space-y-1.5">
          <ProgressBar value={ramPercent} variant={ramStatus.status} />
          <div className="flex justify-between font-mono text-[11px] text-[#9ba0b5]">
            <span>{ramUsedGb} GB kullanılan</span>
            <span>{ramFreeGb} GB boş ({ramTotalGb} GB)</span>
          </div>
        </div>
      </div>

      {/* Disk Kartı */}
      <div className="surface rounded-[22px] p-4 flex flex-col justify-between gap-3 hover:bg-white/[0.1] transition-colors">
        <div className="flex items-center gap-3">
          <span className="w-[38px] h-[38px] rounded-[12px] border border-white/10 bg-white/[0.07] flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4 text-[#eceef6]" />
          </span>
          <div>
            <small className="block text-xs text-[#9ba0b5] font-medium leading-none mb-1">
              {t('metrics.diskUsage') || 'Disk Kullanımı'}
            </small>
            <b className="text-2xl font-bold tracking-tight text-[#eceef6] leading-none">
              %{diskPercent}
            </b>
          </div>
          <div className="ml-auto">
            <Pill status={diskStatus.status} label={diskStatus.label} showDot={false} />
          </div>
        </div>

        <div className="space-y-1.5">
          <ProgressBar value={diskPercent} variant={diskStatus.status} />
          <div className="flex justify-between font-mono text-[11px] text-[#9ba0b5]">
            <span>{current.diskUsedGb} GB kullanılan</span>
            <span>{diskFreeGb} GB boş ({current.diskTotalGb} GB)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
