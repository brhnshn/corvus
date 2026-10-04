import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { Cpu } from 'lucide-react';
import { useI18n } from '../../i18n';

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

  // Eşik tabanlı renk belirleme (Midnight v2: CPU < 70 ok, 70-89 warn, >=90 err)
  const statusColor = currentCpu >= 90 ? '#f87171' : currentCpu >= 70 ? '#fbbf24' : '#34d399';

  return (
    <section className="surface rounded-[22px] p-4 sm:p-5 min-w-0 flex flex-col gap-3">
      {/* Kart Başlığı */}
      <div className="flex items-center gap-3">
        <span className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
          <Cpu className="w-4 h-4 text-[#eceef6]" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-[#eceef6] leading-tight">
            {t('metrics.cpuChartTitle') || 'CPU Kullanımı (%)'}
          </h2>
          <small className="font-mono text-[11px] text-[#9ba0b5]">Çekirdek Yükü &amp; İşlemci Kullanımı</small>
        </div>
        <span className="ml-auto font-mono font-semibold text-[11px] px-2.5 py-1.5 rounded-[11px] border border-white/10 bg-white/[0.06] text-[#eceef6] whitespace-nowrap">
          {t('metrics.lastValue', { value: `%${currentCpu.toFixed(1)}` }) || `Son Değer: %${currentCpu.toFixed(1)}`}
        </span>
      </div>

      {/* Grafik */}
      <div className="h-56 sm:h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={statusColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#9ba0b5" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              minTickGap={28} 
              fontFamily="ui-monospace, Menlo, Consolas, monospace"
            />
            <YAxis 
              domain={[0, 100]} 
              stroke="#9ba0b5" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              unit="%" 
              ticks={[0, 25, 50, 75, 100]}
              fontFamily="ui-monospace, Menlo, Consolas, monospace"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(27,29,42,0.95)', 
                borderColor: 'rgba(255,255,255,0.12)', 
                borderRadius: 12, 
                fontSize: 11,
                fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(16px)'
              }}
              labelFormatter={(_, items) => {
                const item = items?.[0]?.payload as CpuChartDataPoint | undefined;
                return item?.fullTime || '';
              }}
              itemStyle={{ color: statusColor, fontWeight: 600 }}
              formatter={(value: unknown) => [`%${value}`, 'CPU Kullanımı']}
            />
            <Area 
              type="monotone" 
              dataKey="cpu" 
              name="CPU" 
              stroke={statusColor} 
              strokeWidth={1.8}
              fillOpacity={1} 
              fill="url(#cpuGradient)" 
              dot={false}
              activeDot={{ r: 4, stroke: statusColor, strokeWidth: 2, fill: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

