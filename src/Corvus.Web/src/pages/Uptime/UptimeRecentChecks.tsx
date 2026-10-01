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
    <div className="rounded-xl bg-[#1a1d29] border border-[#2a2e3f] overflow-hidden flex flex-col">
      {/* Header with live pulse indicator and filter pills */}
      <div className="px-5 py-3.5 border-b border-[#2a2e3f] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <h3 className="text-sm font-semibold text-[#e5e7eb]">{t('uptime.recentChecks')}</h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[#14161f] p-1 rounded-lg border border-[#2a2e3f]">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-[#242838] text-white shadow-sm'
                : 'text-[#9ca3af] hover:text-[#e5e7eb]'
            }`}
          >
            {t('uptime.filterAll')} ({recentChecks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('up')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filterStatus === 'up'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-[#9ca3af] hover:text-emerald-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {t('uptime.filterUp')} ({upChecks.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('down')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              filterStatus === 'down'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-[#9ca3af] hover:text-rose-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            {t('uptime.filterDown')} ({downChecks.length})
          </button>
        </div>
      </div>

      {/* Checks List Container */}
      <div className="max-h-[340px] overflow-y-auto divide-y divide-[#2a2e3f] scrollbar-thin scrollbar-thumb-[#2a2e3f] scrollbar-track-transparent">
        {recentChecks.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9ca3af]">
            {loadingChecks ? t('common.loading') : t('uptime.noChecksYet')}
          </div>
        ) : filteredChecks.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9ca3af]">
            {t('uptime.noFilteredChecks')}
          </div>
        ) : (
          filteredChecks.map((check) => {
            const checkDate = new Date(check.checkedAt);
            const isUp = check.status === 'up';

            return (
              <div
                key={check.id}
                className="px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-[#1e2130]/50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isUp ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="text-[#e5e7eb] font-mono font-medium text-xs">
                    {checkDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-[#9ca3af] font-mono text-xs">
                    {checkDate.toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                  {check.responseTimeMs !== undefined && (
                    <span
                      className={`font-mono px-2 py-0.5 rounded text-[11px] border font-medium ${getResponseTimeBadgeClass(
                        check.responseTimeMs
                      )}`}
                    >
                      {check.responseTimeMs} ms
                    </span>
                  )}
                  {check.errorMessage && (
                    <span
                      className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded text-[11px] truncate max-w-[180px] sm:max-w-xs cursor-help"
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
