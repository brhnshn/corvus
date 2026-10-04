import React from 'react';
import { ProgressBar, type MetricType } from './ProgressBar';

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  icon?: React.ReactNode;
  progress?: number; // 0 to 100
  metricType?: MetricType;
  variant?: 'ok' | 'warn' | 'err' | 'neutral';
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  icon,
  progress,
  metricType,
  variant,
  footer,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        surface rounded-[20px] p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 transition-colors duration-250 select-none
        ${onClick ? 'cursor-pointer hover:bg-white/[0.12] active:scale-[0.98]' : 'hover:bg-white/[0.08]'}
        ${className}
      `}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#9ba0b5]">
        <span className="truncate">{label}</span>
        {icon && (
          <span className="w-8 h-8 rounded-[11px] border border-white/10 bg-white/[0.07] flex items-center justify-center text-[#eceef6] shrink-0 [&>svg]:w-4 [&>svg]:h-4">
            {icon}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 font-bold tracking-[-0.8px] text-[24px] sm:text-[26px] text-[#eceef6] leading-none">
        <span>{value}</span>
        {unit && <span className="text-xs font-medium text-[#9ba0b5] tracking-normal">{unit}</span>}
      </div>

      {progress !== undefined && (
        <div className="mt-1">
          <ProgressBar value={progress} metricType={metricType} variant={variant} height={5} />
        </div>
      )}

      {footer && <div className="text-[11px] font-mono text-[#9ba0b5] flex justify-between">{footer}</div>}
    </div>
  );
};
