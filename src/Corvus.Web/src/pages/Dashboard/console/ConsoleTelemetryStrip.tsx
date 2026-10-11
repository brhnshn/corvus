import React from 'react';
import { useI18n } from '../../../i18n';
import type { ConsoleTelemetrySummary } from '../types';

interface ConsoleTelemetryStripProps {
  summary: ConsoleTelemetrySummary;
}

export const ConsoleTelemetryStrip: React.FC<ConsoleTelemetryStripProps> = ({ summary }) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#1e2433] bg-[#0e1117] border-t border-[#1e2433] shrink-0 font-mono text-xs select-none">
      {/* 1. CPU */}
      <div className="p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748b] text-[11px]">
          <span>{t('dashboard.console.cpuLoad')}</span>
          <span className="text-[#94a3b8]">Cluster</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-[#f1f5f9]">
            {summary.cpuPercent.toFixed(1)}%
          </span>
          <div className="flex-1 h-1.5 bg-[#141822] rounded-full overflow-hidden border border-[#1e2433]">
            <div
              className={`h-full transition-all ${
                summary.cpuPercent > 80
                  ? 'bg-[#ef4444]'
                  : summary.cpuPercent > 50
                  ? 'bg-[#f59e0b]'
                  : 'bg-[#38bdf8]'
              }`}
              style={{ width: `${Math.min(100, summary.cpuPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Bellek */}
      <div className="p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748b] text-[11px]">
          <span>{t('dashboard.console.memoryLoad')}</span>
          <span className="text-[#94a3b8]">{summary.memoryPercent.toFixed(0)}%</span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-[#f1f5f9]">
            {summary.memoryUsageFormatted}
          </span>
          <div className="flex-1 h-1.5 bg-[#141822] rounded-full overflow-hidden border border-[#1e2433]">
            <div
              className={`h-full transition-all ${
                summary.memoryPercent > 85 ? 'bg-[#ef4444]' : 'bg-[#10b981]'
              }`}
              style={{ width: `${Math.min(100, summary.memoryPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Konteyner & Servis Havuzu */}
      <div className="p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[#64748b] text-[11px]">
          <span>{t('dashboard.console.clusterPool')}</span>
          <span className="text-[#10b981]">{t('dashboard.console.activeCluster')}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-sm font-semibold text-[#f1f5f9]">
            {summary.containersRunningCount} / {summary.containersTotalCount}{' '}
            <span className="text-[10px] text-[#64748b] font-normal">{t('dashboard.console.containersUnit')}</span>
          </div>
          <div className="text-sm font-semibold text-[#f1f5f9]">
            {summary.servicesHealthyCount} / {summary.servicesTotalCount}{' '}
            <span className="text-[10px] text-[#64748b] font-normal">{t('dashboard.console.servicesUnit')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
