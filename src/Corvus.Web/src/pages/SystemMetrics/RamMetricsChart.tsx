import React, { useMemo } from 'react';
import { Database } from 'lucide-react';
import { useI18n } from '../../i18n';
import { ObsidianAreaChart, type ChartDataPoint } from '../../components/ui/ObsidianAreaChart';

interface RamChartDataPoint {
  time: string;
  fullTime: string;
  ramPercent: number;
  ramUsedGb: number;
  ramTotalGb: number;
}

interface RamMetricsChartProps {
  data: RamChartDataPoint[];
  currentRamGb: number;
  totalRamGb: number;
}

export const RamMetricsChart: React.FC<RamMetricsChartProps> = ({ 
  data, 
  currentRamGb, 
  totalRamGb 
}) => {
  const { t } = useI18n();

  // Eşik tabanlı renk belirleme (ObsidianUI: RAM < 80 up, 80-89 warn, >=90 down)
  const ramPercent = totalRamGb > 0 ? (currentRamGb / totalRamGb) * 100 : 0;
  const statusColor = ramPercent >= 90 ? 'var(--status-down)' : ramPercent >= 80 ? 'var(--status-warn)' : 'var(--status-up)';

  const chartData: ChartDataPoint[] = useMemo(() => {
    return data.map((d) => ({
      time: d.time,
      fullTime: d.fullTime,
      value: d.ramUsedGb,
    }));
  }, [data]);

  return (
    <section className="surface rounded-[22px] p-4 sm:p-5 min-w-0 flex flex-col gap-3">
      {/* Kart Başlığı */}
      <div className="flex items-center gap-3">
        <span className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
          <Database className="w-4 h-4 text-[#eceef6]" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-[#eceef6] leading-tight">
            {t('metrics.ramChartTitle') || 'RAM Kullanımı (GB)'}
          </h2>
          <small className="font-mono text-[11px] text-[#9ba0b5]">Fiziksel RAM &amp; Bellek Tüketimi</small>
        </div>
        <span className="ml-auto font-mono font-semibold text-[11px] px-2.5 py-1.5 rounded-[11px] border border-white/10 bg-white/[0.06] text-[#eceef6] whitespace-nowrap">
          {t('metrics.lastValue', { value: `${currentRamGb} GB / ${totalRamGb} GB` }) || `Son Değer: ${currentRamGb} GB / ${totalRamGb} GB`}
        </span>
      </div>

      {/* Hafif Vektörel SVG Grafik */}
      <div className="w-full pt-1">
        <ObsidianAreaChart
          data={chartData}
          color={statusColor}
          height={230}
          min={0}
          max={totalRamGb > 0 ? totalRamGb : undefined}
          unit=" GB"
          valueFormatter={(val) => {
            const pct = totalRamGb > 0 ? Math.round((val / totalRamGb) * 100) : 0;
            return `${val.toFixed(1)} GB / ${totalRamGb} GB (%${pct})`;
          }}
          ariaLabel="RAM Kullanım Grafiği"
        />
      </div>
    </section>
  );
};
