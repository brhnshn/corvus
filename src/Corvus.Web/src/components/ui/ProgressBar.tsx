import React from 'react';

export type MetricType = 'cpu' | 'ram' | 'disk' | 'containers' | 'neutral';

export interface ProgressBarProps {
  value: number; // 0 to 100
  metricType?: MetricType;
  variant?: 'ok' | 'warn' | 'err' | 'neutral';
  height?: number;
  className?: string;
}

export function getMetricStatus(value: number, metricType: MetricType): 'ok' | 'warn' | 'err' | 'neutral' {
  if (metricType === 'neutral') return 'neutral';
  
  if (metricType === 'cpu') {
    if (value >= 90) return 'err';
    if (value >= 70) return 'warn';
    return 'ok';
  }

  if (metricType === 'ram' || metricType === 'disk') {
    if (value >= 90) return 'err';
    if (value >= 80) return 'warn';
    return 'ok';
  }

  if (metricType === 'containers') {
    if (value < 75) return 'err';
    if (value < 100) return 'warn';
    return 'ok';
  }

  return 'ok';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  metricType = 'neutral',
  variant,
  height = 6,
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const status = variant || getMetricStatus(clampedValue, metricType);

  const fillColors = {
    ok: 'bg-[#34d399]',
    warn: 'bg-[#fbbf24]',
    err: 'bg-[#f87171]',
    neutral: 'bg-[#d5d5dc]/55',
  }[status];

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full bg-white/10 rounded-full overflow-hidden select-none ${className}`}
      style={{ height: `${height}px` }}
    >
      <div
        className={`h-full rounded-full ${fillColors} transition-[width] duration-[800ms] ease-[cubic-bezier(.22,1,.36,1)] transition-colors duration-400`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};
