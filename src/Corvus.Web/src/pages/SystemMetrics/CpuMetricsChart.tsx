import React, { useMemo } from 'react';
import { Cpu } from 'lucide-react';
import { useI18n } from '../../i18n';
import { ObsidianAreaChart, type ChartDataPoint } from '../../components/ui/ObsidianAreaChart';

interface CpuChartDataPoint {
  time: string;
  fullTime: string;
  cpu: number;
}

interface CpuMetricsChartProps {
  data: CpuChartDataPoint[];
  currentCpu: number;
}

export const CpuMetricsChart: React.FC<CpuMetricsChartProps> = ({ data, currentCpu }) => {
  const { t } = useI18n();

  // Eşik tabanlı renk belirleme (ObsidianUI: CPU < 70 up, 70-89 warn, >=90 down)
  const statusColor = currentCpu >= 90 ? 'var(--status-down)' : currentCpu >= 70 ? 'var(--status-warn)' : 'var(--status-up)';

  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((d) => ({
      time: d.time,
      fullTime: d.fullTime,
      value: d.cpu,
    }));
  }, [data]);

  return (
    <section className="surface rounded-[22px] p-4 sm:p-5 min-w-0 flex flex-col gap-3">
      {/* Kart Başlığı */}
      <div className="flex items-center gap-3">
        <span className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-[#eceef6]" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-[#eceef6] leading-tight">
            {t('metrics.cpuChartTitle')}
          </h2>
          <small className="font-mono text-[11px] text-[#9ba0b5]">{t('metrics.cpuSubtitle')}</small>
        </div>
        <span className="ml-auto font-mono font-semibold text-[11px] px-2.5 py-1.5 rounded-[11px] border border-white/10 bg-white/[0.06] text-[#eceef6] whitespace-nowrap">
          {t('metrics.lastValue', { value: `%${currentCpu.toFixed(1)}` })}
        </span>
      </div>

      {/* Hafif Vektörel SVG Grafik */}
      <div className="w-full pt-1">
        <ObsidianAreaChart
          data={chartData}
          color={statusColor}
          height={230}
          min={0}
          max={100}
          unit="%"
          valueFormatter={(val) => `%${val.toFixed(1)}`}
          ariaLabel={t('metrics.cpuAriaLabel')}
        />
      </div>
    </section>
  );
};
