import React from 'react';
import { Cpu, HardDrive, ArrowUpDown } from 'lucide-react';
import type { ContainerStats } from '../../api/client';
import { formatBytes } from '../../utils/format';

interface ContainerStatsBadgesProps {
  stats?: ContainerStats;
  isRunning: boolean;
}

export const ContainerStatsBadges: React.FC<ContainerStatsBadgesProps> = ({ stats, isRunning }) => {
  if (!isRunning) return null;

  if (!stats) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono mt-1 opacity-50 animate-pulse">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/5 border border-indigo-500/20 text-indigo-400/60">
          <Cpu className="w-3 h-3" />
          %--
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/5 border border-cyan-500/20 text-cyan-400/60">
          <HardDrive className="w-3 h-3" />
          -- MB
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700/50 text-slate-500">
          <ArrowUpDown className="w-3 h-3" />
          ↓-- ↑--
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono mt-1 transition-opacity duration-300">
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
        <Cpu className="w-3 h-3" />
        %{stats.cpuPercent.toFixed(1)}
      </span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
        <HardDrive className="w-3 h-3" />
        {formatBytes(stats.memoryUsageBytes)} ({stats.memoryPercent.toFixed(0)}%)
      </span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
        <ArrowUpDown className="w-3 h-3" />
        ↓{formatBytes(stats.networkRxBytes)} ↑{formatBytes(stats.networkTxBytes)}
      </span>
    </div>
  );
};
