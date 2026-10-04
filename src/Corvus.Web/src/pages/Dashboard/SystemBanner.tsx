import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export interface SystemBannerProps {
  status: 'ok' | 'warn' | 'err';
  message: string;
  subtext?: string;
  lastCheckText?: string;
}

export const SystemBanner: React.FC<SystemBannerProps> = ({
  status,
  message,
  subtext,
  lastCheckText = 'son kontrol az önce',
}) => {
  const bannerStyles = {
    ok: 'bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]',
    warn: 'bg-[#fbbf24]/10 border-[#fbbf24]/35 text-[#fbbf24]',
    err: 'bg-[#f87171]/10 border-[#f87171]/35 text-[#f87171]',
  }[status];

  const Icon = status === 'ok' ? CheckCircle2 : status === 'warn' ? AlertTriangle : AlertCircle;

  return (
    <div
      className={`
        surface flex items-center gap-3 px-4 py-3 rounded-[18px] border text-sm font-semibold transition-all duration-300 animate-rv
        ${bannerStyles}
      `}
      style={{ animationDelay: '80ms' }}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-[#eceef6]">{message}</span>
        {subtext && <span className="text-xs opacity-75 font-normal">({subtext})</span>}
      </div>
      {lastCheckText && (
        <small className="ml-auto font-mono text-[11px] text-[#9ba0b5] whitespace-nowrap shrink-0">
          {lastCheckText}
        </small>
      )}
    </div>
  );
};
