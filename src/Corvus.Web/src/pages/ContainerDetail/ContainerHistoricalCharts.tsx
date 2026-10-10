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
import { Cpu, HardDrive } from 'lucide-react';
import { formatBytes } from '../../utils/format';

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
  if (!isRunning || data.length === 0) {
    return null;
  }

  const latest = data[data.length - 1];
  const currentCpu = latest?.cpuPercent ?? 0;
  const currentMemPercent = latest?.memoryPercent ?? 0;
  const currentMemBytes = latest?.memoryUsageBytes ?? 0;

  // Renk tanımları
  const cpuColor = currentCpu >= 85 ? '#f87171' : currentCpu >= 60 ? '#fbbf24' : '#818cf8';
  const memColor = currentMemPercent >= 85 ? '#f87171' : currentMemPercent >= 60 ? '#fbbf24' : '#34d399';

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
              <h3 className="text-sm font-bold text-[#eceef6]">CPU Kullanım Trendi</h3>
              <p className="text-[11px] text-[#9ba0b5]">Son periyottaki çekirdek yükü</p>
            </div>
          </div>
          <span className="font-mono font-semibold text-xs px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6]">
            %{currentCpu.toFixed(1)}
          </span>
        </div>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="containerCpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={cpuColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={cpuColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as ContainerTelemetryPoint;
                    return (
                      <div className="sheet-glass border border-white/15 rounded-xl p-2.5 shadow-xl text-xs space-y-1">
                        <div className="text-[10px] font-mono text-[#9ba0b5]">{point.fullTime}</div>
                        <div className="font-mono font-bold text-indigo-300">
                          CPU: %{point.cpuPercent.toFixed(1)}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="cpuPercent"
                stroke={cpuColor}
                strokeWidth={2}
                fill="url(#containerCpuGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
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
              <h3 className="text-sm font-bold text-[#eceef6]">Bellek (RAM) Trendi</h3>
              <p className="text-[11px] text-[#9ba0b5]">
                {memoryLimitBytes > 0 ? `Limit: ${formatBytes(memoryLimitBytes)}` : 'Limitsiz bellek alanı'}
              </p>
            </div>
          </div>
          <span className="font-mono font-semibold text-xs px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6]">
            {formatBytes(currentMemBytes)} (%{currentMemPercent.toFixed(1)})
          </span>
        </div>

        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 10, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="containerMemGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={memColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={memColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                unit="%"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const point = payload[0].payload as ContainerTelemetryPoint;
                    return (
                      <div className="sheet-glass border border-white/15 rounded-xl p-2.5 shadow-xl text-xs space-y-1">
                        <div className="text-[10px] font-mono text-[#9ba0b5]">{point.fullTime}</div>
                        <div className="font-mono font-bold text-emerald-300">
                          RAM: {formatBytes(point.memoryUsageBytes)} (%{point.memoryPercent.toFixed(1)})
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="memoryPercent"
                stroke={memColor}
                strokeWidth={2}
                fill="url(#containerMemGrad)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
