import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import type { UptimeCheckItem } from '../../types';
import { useI18n } from '../../i18n';

interface UptimeRecentChecksProps {
  recentChecks: UptimeCheckItem[];
  loadingChecks: boolean;
}

export const UptimeRecentChecks: React.FC<UptimeRecentChecksProps> = ({
  recentChecks,
  loadingChecks
}) => {
  const { t } = useI18n();
  const [filterStatus, setFilterStatus] = useState<'all' | 'up' | 'down'>('all');

  const upChecks = recentChecks.filter((c) => c.status === 'up');
  const downChecks = recentChecks.filter((c) => c.status !== 'up');

  const filteredChecks = recentChecks.filter((c) => {
    if (filterStatus === 'up') return c.status === 'up';
    if (filterStatus === 'down') return c.status !== 'up';
    return true;
  });

  const getResponseTimeBadgeClass = (ms: number) => {
    if (ms < 200) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (ms <= 500) {
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    }
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  return (
    <div className="rounded-2xl surface border border-white/10 overflow-hidden flex flex-col">
      {/* Header with live pulse indicator and filter pills */}
      <div className="px-5 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h3 className="text-sm font-semibold text-white">{t('uptime.recentChecks')}</h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-white text-black font-semibold shadow-xs'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {t('uptime.filterAll')} ({recentChecks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('up')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filterStatus === 'up'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-white/60 hover:text-emerald-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {t('uptime.filterUp')} ({upChecks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('down')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filterStatus === 'down'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-white/60 hover:text-rose-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            {t('uptime.filterDown')} ({downChecks.length})
          </button>
        </div>
      </div>

      {/* Checks List Container */}
      <div className="max-h-[340px] overflow-y-auto divide-y divide-white/10">
        {recentChecks.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/50">
            {loadingChecks ? t('common.loading') : t('uptime.noChecksYet')}
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-xs text-white/50">
            {t('uptime.noFilteredChecks')}
          </div>
        ) : (
          filteredChecks.map((check) => {
            const checkDate = new Date(check.checkedAt);
            const isUp = check.status === 'up';

            return (
              <div
                key={check.id}
                className="px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isUp ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="text-white/90 font-mono font-medium text-xs">
                    {checkDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-white/50 font-mono text-xs">
                    {checkDate.toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                  {check.responseTimeMs !== undefined && (
                    <span
                      className={`font-mono px-2 py-0.5 rounded-md text-[11px] border font-medium ${getResponseTimeBadgeClass(
                        check.responseTimeMs
                      )}`}
                    >
                      {check.responseTimeMs} ms
                    </span>
                  )}
                  {check.errorMessage && (
                    <span
                      className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md text-[11px] truncate max-w-[180px] sm:max-w-xs cursor-help"
                      title={check.errorMessage}
                    >
                      {check.errorMessage}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
