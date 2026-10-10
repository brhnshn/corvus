import React from 'react';
import { Cpu, HardDrive, ArrowDownRight, ArrowUpRight, Activity } from 'lucide-react';
import type { ContainerStats } from '../../types';
import { formatBytes } from '../../utils/format';
import { useI18n } from '../../i18n';

interface ContainerTelemetryHeroProps {
  stats: ContainerStats | null;
  isRunning: boolean;
}

export const ContainerTelemetryHero: React.FC<ContainerTelemetryHeroProps> = ({
  stats,
  isRunning
}) => {
  const { t } = useI18n();

  if (!isRunning) {
    return null;
  }

  const cpuPercent = stats ? +stats.cpuPercent.toFixed(1) : 0;
  const memUsedBytes = stats?.memoryUsageBytes ?? 0;
  const memLimitBytes = stats?.memoryLimitBytes ?? 0;
  const memPercent = stats ? +stats.memoryPercent.toFixed(1) : 0;
  const netRx = stats?.networkRxBytes ?? 0;
  const netTx = stats?.networkTxBytes ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-rv">
      {/* 1. CPU Kullanımı */}
      <div className="surface rounded-[20px] p-4 border border-white/10 flex flex-col justify-between gap-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#9ba0b5]">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="font-medium">{t('containers.cpuUsage') || 'CPU Kullanımı'}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60">
            vCPU Live
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold font-mono tracking-tight text-[#eceef6]">
            %{cpuPercent}
          </div>
          <div className="text-xs text-[#9ba0b5] font-mono">
            {cpuPercent > 80 ? '⚠️ Yüksek Yük' : 'Nominal'}
          </div>
        </div>
        <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              cpuPercent > 80 ? 'bg-red-400' : cpuPercent > 50 ? 'bg-amber-400' : 'bg-indigo-400'
            }`}
            style={{ width: `${Math.min(cpuPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 2. Bellek (RAM) Kullanımı */}
      <div className="surface rounded-[20px] p-4 border border-white/10 flex flex-col justify-between gap-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#9ba0b5]">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Bellek (RAM)</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60">
            %{memPercent}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl font-bold font-mono tracking-tight text-[#eceef6]">
            {formatBytes(memUsedBytes)}
          </div>
          <div className="text-xs text-[#9ba0b5] font-mono">
            {memLimitBytes > 0 ? `/ ${formatBytes(memLimitBytes)}` : 'Limitsiz'}
          </div>
        </div>
        <div className="w-full bg-white/[0.08] rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              memPercent > 85 ? 'bg-red-400' : memPercent > 60 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(memPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* 3. Ağ I/O (Trafik) */}
      <div className="surface rounded-[20px] p-4 border border-white/10 flex flex-col justify-between gap-3 sm:col-span-2 lg:col-span-1 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#9ba0b5]">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="font-medium">Ağ Trafiği</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-white/60">
            cgroup Net
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="text-[10px] text-[#9ba0b5] uppercase tracking-wider font-medium">Gelen (Rx)</div>
              <div className="text-sm font-semibold font-mono text-[#eceef6]">{formatBytes(netRx)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-sky-500/10 text-sky-400">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="text-[10px] text-[#9ba0b5] uppercase tracking-wider font-medium">Giden (Tx)</div>
              <div className="text-sm font-semibold font-mono text-[#eceef6]">{formatBytes(netTx)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
