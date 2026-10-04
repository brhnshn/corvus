import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

export interface SslBadgeProps {
  daysRemaining?: number | null;
  isValid?: boolean;
  className?: string;
}

export const SslBadge: React.FC<SslBadgeProps> = ({
  daysRemaining,
  isValid = true,
  className = '',
}) => {
  if (daysRemaining === undefined || daysRemaining === null) {
    return null;
  }

  const status = !isValid || daysRemaining < 7 ? 'err' : daysRemaining <= 30 ? 'warn' : 'ok';

  const badgeStyles = {
    ok: 'text-[#34d399] bg-[#34d399]/12 border-[#34d399]/30',
    warn: 'text-[#fbbf24] bg-[#fbbf24]/12 border-[#fbbf24]/30',
    err: 'text-[#f87171] bg-[#f87171]/12 border-[#f87171]/30',
  }[status];

  const Icon = status === 'ok' ? ShieldCheck : status === 'warn' ? ShieldAlert : ShieldX;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] border font-mono text-[11px] font-medium select-none ${badgeStyles} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>
        {daysRemaining <= 0
          ? 'SSL Süresi Doldu'
          : `SSL: ${daysRemaining} gün kaldı`}
      </span>
    </span>
  );
};
