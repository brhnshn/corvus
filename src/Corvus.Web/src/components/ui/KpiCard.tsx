import React from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { AnimatedBar } from './AnimatedBar';

export interface KpiCardProps {
  label: React.ReactNode;
  value: number | string;
  isNumeric?: boolean;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  meta?: React.ReactNode;
  subtext?: React.ReactNode;
  barPercentage?: number;
  barColor?: string;
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  isNumeric = typeof value === 'number',
  prefix = '',
  suffix = '',
  decimals = 1,
  meta,
  subtext,
  barPercentage,
  barColor,
  onClick,
  className = '',
}) => {
  return (
    <div
      className={`kpi-box ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="kpi-label">
        <span className="truncate">{label}</span>
        {meta && <span className="shrink-0 flex items-center gap-1.5">{meta}</span>}
      </div>

      <div className="kpi-val">
        {isNumeric && typeof value === 'number' ? (
          <AnimatedNumber
            value={value}
            prefix={prefix}
            suffix={suffix}
            decimals={decimals}
          />
        ) : (
          <span className="mono">
            {prefix}
            {value}
            {suffix}
          </span>
        )}
      </div>

      {typeof barPercentage === 'number' && (
        <AnimatedBar percentage={barPercentage} color={barColor} height={4} />
      )}

      {subtext && <div className="kpi-sub truncate">{subtext}</div>}
    </div>
  );
};
