import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import { formatBytes } from '../../../utils/format';
import { useI18n } from '../../../i18n';
import type { ContainerStats } from '../../../types';

export interface ContainerRowResourcesProps {
  isRunning: boolean;
  stats?: ContainerStats;
}

export const ContainerRowResources: React.FC<ContainerRowResourcesProps> = ({
  isRunning,
  stats,
}) => {
  const { t } = useI18n();

  const cpuPercent = stats ? Math.round(stats.cpuPercent) : 0;
  const ramBytes = stats?.memoryUsageBytes ?? 0;
  const ramPercent = stats ? Math.round(stats.memoryPercent) : 0;

  return (
    <div className="space-y-1.5 text-xs">
      {isRunning && stats ? (
        <>
          <div>
            <div className="flex justify-between text-[11px] text-[#9ba0b5] mb-1 font-mono">
              <span>CPU: <b className="text-[#eceef6]">{cpuPercent}%</b></span>
              <span>RAM: <b className="text-[#eceef6]">{formatBytes(ramBytes)}</b></span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ProgressBar value={cpuPercent} metricType="cpu" height={5} />
              <ProgressBar value={ramPercent} metricType="ram" height={5} />
            </div>
          </div>

          {(stats.networkRxBytes > 0 || stats.networkTxBytes > 0) && (
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#9ba0b5] pt-0.5">
              <span className="flex items-center gap-0.5 text-emerald-400">
                <ArrowDownRight className="w-3 h-3" />
                {formatBytes(stats.networkRxBytes)}
              </span>
              <span className="flex items-center gap-0.5 text-indigo-300">
                <ArrowUpRight className="w-3 h-3" />
                {formatBytes(stats.networkTxBytes)}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="font-mono text-[11px] text-[var(--text-muted)]">
          {isRunning ? '-' : t('containers.stateStopped')}
        </div>
      )}
    </div>
  );
};
