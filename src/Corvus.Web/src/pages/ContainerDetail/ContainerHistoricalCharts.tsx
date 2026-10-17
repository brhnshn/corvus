import React, { useMemo } from 'react';
import { Cpu, HardDrive } from 'lucide-react';
import { formatBytes } from '../../utils/format';
import { ObsidianAreaChart, type ChartDataPoint } from '../../components/ui/ObsidianAreaChart';
import { useI18n } from '../../i18n';

export interface ContainerTelemetryPoint {
  time: string;
  fullTime: string;
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

interface ContainerHistoricalChartsProps {
  data: ContainerTelemetryPoint[];
  isRunning: boolean;
  memoryLimitBytes?: number;
}

export const ContainerHistoricalCharts: React.FC<ContainerHistoricalChartsProps> = ({
  data,
  isRunning,
  memoryLimitBytes = 0
}) => {
  const { t } = useI18n();

  const cpuChartData: ChartDataPoint[] = useMemo(() => {
    return data.map((d) => ({
      time: d.time,
      fullTime: d.fullTime,
      value: d.cpuPercent,
    }));
  }, [data]);

  const memChartData: ChartDataPoint[] = useMemo(() => {
    return data.map((d) => ({
      time: d.time,
      fullTime: d.fullTime,
      value: d.memoryUsageBytes,
    }));
  }, [data]);

  if (!isRunning || data.length === 0) {
    return null;
  }

  const latest = data[data.length - 1];
  const currentCpu = latest?.cpuPercent ?? 0;
  const currentMemPercent = latest?.memoryPercent ?? 0;
  const currentMemBytes = latest?.memoryUsageBytes ?? 0;

  // Renk tanımları
  const cpuColor = currentCpu >= 85 ? 'var(--status-down)' : currentCpu >= 60 ? 'var(--status-warn)' : '#818cf8';
  const memColor = currentMemPercent >= 85 ? 'var(--status-down)' : currentMemPercent >= 60 ? 'var(--status-warn)' : 'var(--status-up)';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-rv">
      {/* 1. CPU Trend Grafiği */}
      <section className="surface rounded-[22px] p-4 sm:p-5 border border-white/10 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#eceef6]">{t('containers.chartCpuTrendTitle')}</h3>
              <p className="text-[11px] text-[#9ba0b5]">{t('containers.chartCpuTrendSubtitle')}</p>
            </div>
          </div>
          <span className="font-mono font-semibold text-xs px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6]">
            %{currentCpu.toFixed(1)}
          </span>
        </div>

        <div className="w-full pt-1">
          <ObsidianAreaChart
            data={cpuChartData}
            color={cpuColor}
            height={180}
            min={0}
            unit="%"
            valueFormatter={(val) => `CPU: %${val.toFixed(1)}`}
            ariaLabel={t('containers.chartCpuAriaLabel')}
          />
        </div>
      </section>

      {/* 2. RAM (Bellek) Trend Grafiği */}
      <section className="surface rounded-[22px] p-4 sm:p-5 border border-white/10 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#eceef6]">{t('containers.chartRamTrendTitle')}</h3>
              <p className="text-[11px] text-[#9ba0b5]">
                {memoryLimitBytes > 0
                  ? t('containers.chartRamLimitSubtitle', { limit: formatBytes(memoryLimitBytes) })
                  : t('containers.chartRamUnlimitedSubtitle')}
              </p>
            </div>
          </div>
          <span className="font-mono font-semibold text-xs px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6]">
            {formatBytes(currentMemBytes)} (%{currentMemPercent.toFixed(1)})
          </span>
        </div>

        <div className="w-full pt-1">
          <ObsidianAreaChart
            data={memChartData}
            color={memColor}
            height={180}
            min={0}
            max={memoryLimitBytes > 0 ? memoryLimitBytes : undefined}
            valueFormatter={(val) => {
              const pct = memoryLimitBytes > 0 ? Math.round((val / memoryLimitBytes) * 100) : null;
              return pct !== null ? `${formatBytes(val)} (%${pct})` : formatBytes(val);
            }}
            ariaLabel={t('containers.chartRamAriaLabel')}
          />
        </div>
      </section>
    </div>
  );
};
