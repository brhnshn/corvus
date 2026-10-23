import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { formatBytes } from '../../../utils/format';
import { useI18n } from '../../../i18n';

interface PruneFooterProps {
  hasResult: boolean;
  isExecuting: boolean;
  selectedCount: number;
  selectedBytes: number;
  onDone: () => void;
  onCancel: () => void;
  onExecute: () => void;
}

export const PruneFooter: React.FC<PruneFooterProps> = ({
  hasResult,
  isExecuting,
  selectedCount,
  selectedBytes,
  onDone,
  onCancel,
  onExecute
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-t border-white/10">
      {hasResult ? (
        <button
          onClick={onDone}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-medium text-xs text-[#0a0d14] transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          {t('containers.pruneDoneButton')}
        </button>
      ) : (
        <>
          {/* Canlı Hesaplanan Geri Kazanım Özeti */}
          <div className="text-xs">
            <span className="text-[var(--text-secondary)]">
              {t('containers.selectedCount', { count: selectedCount })}
            </span>
            <span className="mx-2 text-white/20">|</span>
            <span className="text-[var(--text-secondary)]">
              {t('containers.reclaimableAmount', { amount: '' })}
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {formatBytes(selectedBytes)}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isExecuting}
              className="px-4 py-2 rounded-xl border border-[var(--border-hairline)] bg-white/[0.04] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.08] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t('common.cancel')}
            </button>

            <button
              type="button"
              onClick={onExecute}
              disabled={isExecuting || selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-rose-500/20 transition-all disabled:cursor-not-allowed cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('containers.pruningInProgress')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {t('containers.pruneSelectedBtn', { count: selectedCount })}
                  </span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
