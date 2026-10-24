import React from 'react';
import { Play, Square, RotateCw, Pause, Terminal, FileText } from 'lucide-react';
import { useI18n } from '../../../../i18n';

export interface OverviewActionsToolbarProps {
  isAdmin: boolean;
  actionLoading: boolean;
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onPause: () => void;
  onUnpause: () => void;
  onOpenTerminal: () => void;
  onOpenLogs: () => void;
}

export const OverviewActionsToolbar: React.FC<OverviewActionsToolbarProps> = ({
  isAdmin,
  actionLoading,
  isRunning,
  isPaused,
  onStart,
  onStop,
  onRestart,
  onPause,
  onUnpause,
  onOpenTerminal,
  onOpenLogs,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 surface rounded-2xl border border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[#9ba0b5] uppercase tracking-wider">
          {t('containers.quickActions')}:
        </span>
        {isAdmin && (
          <div className="flex items-center gap-1.5">
            {!isRunning ? (
              <button
                type="button"
                onClick={onStart}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#34d399] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {t('containers.start')}
              </button>
            ) : (
              <button
                type="button"
                onClick={onStop}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#f87171] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                {t('containers.stop')}
              </button>
            )}

            <button
              type="button"
              onClick={onRestart}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#eceef6] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#9ba0b5]" />
              {t('containers.restart')}
            </button>

            {isRunning && (
              isPaused ? (
                <button
                  type="button"
                  onClick={onUnpause}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#34d399] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t('containers.resume')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPause}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#fbbf24] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  {t('containers.pause')}
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isAdmin && isRunning && (
          <button
            type="button"
            onClick={onOpenTerminal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-xl transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            {t('containers.openTerminal')}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#eceef6] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-[#9ba0b5]" />
          {t('containers.viewLogs')}
        </button>
      </div>
    </div>
  );
};
