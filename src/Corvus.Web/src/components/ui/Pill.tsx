import React from 'react';

export type StatusType = 'ok' | 'warn' | 'err' | 'neutral' | 'info';

export interface PillProps {
  status: StatusType;
  label: string;
  sublabel?: string;
  showDot?: boolean;
  className?: string;
}

export const Pill: React.FC<PillProps> = ({
  status,
  label,
  sublabel,
  showDot = true,
  className = '',
}) => {
  const statusStyles = {
    ok: 'bg-[#34d399]/16 text-[#34d399] border-[#34d399]/30',
    warn: 'bg-[#fbbf24]/16 text-[#fbbf24] border-[#fbbf24]/30',
    err: 'bg-[#f87171]/16 text-[#f87171] border-[#f87171]/30',
    info: 'bg-[#818cf8]/16 text-[#818cf8] border-[#818cf8]/30',
    neutral: 'bg-white/10 text-[#9ba0b5] border-white/15',
  }[status];

  const dotBg = {
    ok: 'bg-[#34d399]',
    warn: 'bg-[#fbbf24]',
    err: 'bg-[#f87171]',
    info: 'bg-[#818cf8]',
    neutral: 'bg-[#9ba0b5]',
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[12px] text-[11px] font-semibold border ${statusStyles} select-none ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotBg} ${
            status === 'ok' ? 'animate-dot-pulse' : ''
          }`}
        />
      )}
      <span>{label}</span>
      {sublabel && <span className="opacity-70 font-mono text-[10px] ml-0.5">({sublabel})</span>}
    </span>
  );
};
