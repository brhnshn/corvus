import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import type { PublicService } from '../../types';

interface PublicStatusServiceBarProps {
  checks: PublicService['recentChecks'];
  totalSlots?: number;
}

export function PublicStatusServiceBar({ checks = [], totalSlots = 30 }: PublicStatusServiceBarProps) {
  const { t } = useI18n();

  const slots = useMemo(() => {
    const padded = [...Array(Math.max(0, totalSlots - checks.length)).fill(null), ...checks.slice(-totalSlots)];
    return padded;
  }, [checks, totalSlots]);

  const getStatusColor = (status?: string | null) => {
    if (!status) return 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-700';
    if (status === 'up' || status === 'healthy') return 'bg-emerald-500 hover:bg-emerald-400 border-emerald-400/40';
    if (status === 'degraded') return 'bg-amber-500 hover:bg-amber-400 border-amber-400/40';
    return 'bg-rose-500 hover:bg-rose-400 border-rose-400/40';
  };

  const getStatusText = (status?: string | null) => {
    if (!status) return t('publicStatus.noData');
    if (status === 'up' || status === 'healthy') return t('publicStatus.statusHealthy');
    if (status === 'degraded') return t('publicStatus.statusDegraded');
    return t('publicStatus.statusDown');
  };

  return (
    <div className="w-full space-y-1.5 pt-2">
      {/* Bars row */}
      <div className="flex items-center gap-[3px] sm:gap-1 w-full h-8">
        {slots.map((check, idx) => {
          const isLeft = idx < 3;
          const isRight = idx >= totalSlots - 3;
          const alignClass = isLeft 
            ? 'left-0 items-start' 
            : isRight 
            ? 'right-0 items-end' 
            : 'left-1/2 -translate-x-1/2 items-center';

          return (
            <div key={idx} className="group relative flex-1 h-full flex flex-col justify-center">
              <div
                className={`w-full h-6 rounded-[2.5px] border transition-transform duration-150 group-hover:scale-y-125 cursor-pointer ${getStatusColor(
                  check?.status
                )}`}
              />

              {/* Hover Tooltip */}
              <div
                className={`absolute bottom-full mb-2 hidden group-hover:flex flex-col z-30 pointer-events-none whitespace-nowrap ${alignClass}`}
              >
                <div className="bg-slate-900/95 backdrop-blur-md text-slate-200 text-[11px] rounded-lg py-1.5 px-2.5 shadow-xl border border-slate-700/80 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-white">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !check
                          ? 'bg-slate-500'
                          : check.status === 'up' || check.status === 'healthy'
                          ? 'bg-emerald-400'
                          : check.status === 'degraded'
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span>{getStatusText(check?.status)}</span>
                    {check?.responseTimeMs !== undefined && check?.responseTimeMs !== null && (
                      <span className="text-slate-400 font-normal ml-1">({check.responseTimeMs} ms)</span>
                    )}
                  </div>
                  {check?.checkedAt ? (
                    <span className="text-[10px] text-slate-400">
                      {new Date(check.checkedAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">{t('publicStatus.noData')}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend / Timeline labels */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-0.5">
        <span>{t('publicStatus.checksAgo', { count: totalSlots })}</span>
        <div className="h-px bg-slate-800/80 flex-1 mx-3" />
        <span>{t('publicStatus.now')}</span>
      </div>
    </div>
  );
}
