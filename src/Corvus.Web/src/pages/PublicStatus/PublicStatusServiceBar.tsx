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
    const list = checks || [];
    const padded = [...Array(Math.max(0, totalSlots - list.length)).fill(null), ...list.slice(-totalSlots)];
    return padded;
  }, [checks, totalSlots]);

  const getStatusColor = (status?: string | null) => {
    if (!status) return 'bg-white/[0.06] border-white/5 hover:bg-white/10';
    if (status === 'up' || status === 'healthy') return 'bg-[#34d399] hover:brightness-110 border-[#34d399]/40';
    if (status === 'degraded') return 'bg-[#fbbf24] hover:brightness-110 border-[#fbbf24]/40';
    return 'bg-[#f87171] hover:brightness-110 border-[#f87171]/40';
  };

  const getStatusText = (status?: string | null) => {
    if (!status) return t('publicStatus.noData') || 'Veri yok';
    if (status === 'up' || status === 'healthy') return t('publicStatus.statusHealthy') || 'Çalışıyor';
    if (status === 'degraded') return t('publicStatus.statusDegraded') || 'Aksaklık';
    return t('publicStatus.statusDown') || 'Kesinti';
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
                <div className="surface text-[#eceef6] text-[11px] rounded-[10px] py-1.5 px-2.5 shadow-xl border border-white/15 flex flex-col gap-0.5 font-mono">
                  <div className="flex items-center gap-1.5 font-semibold text-[#eceef6]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        !check
                          ? 'bg-[#9ba0b5]'
                          : check.status === 'up' || check.status === 'healthy'
                          ? 'bg-[#34d399]'
                          : check.status === 'degraded'
                          ? 'bg-[#fbbf24]'
                          : 'bg-[#f87171]'
                      }`}
                    />
                    <span>{getStatusText(check?.status)}</span>
                    {check?.responseTimeMs !== undefined && check?.responseTimeMs !== null && (
                      <span className="text-[#9ba0b5] font-normal ml-1">({check.responseTimeMs} ms)</span>
                    )}
                  </div>
                  {check?.checkedAt ? (
                    <span className="text-[10px] text-[#9ba0b5]">
                      {new Date(check.checkedAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#9ba0b5]">{t('publicStatus.noData') || 'Veri yok'}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend / Timeline labels */}
      <div className="flex items-center justify-between text-[11px] text-[#9ba0b5] font-mono px-0.5">
        <span>{t('publicStatus.checksAgo', { count: totalSlots }) || `${totalSlots} kontrol önce`}</span>
        <div className="h-px bg-white/10 flex-1 mx-3" />
        <span>{t('publicStatus.now') || 'Şimdi'}</span>
      </div>
    </div>
  );
}
