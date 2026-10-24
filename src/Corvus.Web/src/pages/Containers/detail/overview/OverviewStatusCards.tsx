import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '../../../../i18n';
import type { DockerContainerInspectInfo } from '../../../../types';
import type { getInspectState } from '../inspectHelpers';

export interface OverviewStatusCardsProps {
  inspect: DockerContainerInspectInfo;
  state: ReturnType<typeof getInspectState>;
  isRunning: boolean;
  statusStr: string;
}

export const OverviewStatusCards: React.FC<OverviewStatusCardsProps> = ({
  inspect,
  state,
  isRunning,
  statusStr,
}) => {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(inspect.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <>
      {/* Full ID Card */}
      <div className="p-4 surface rounded-2xl border border-white/10 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[#9ba0b5]">
          <span>{t('containers.containerIdFull')}</span>
          <button
            type="button"
            onClick={handleCopyId}
            className="text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer"
            title={t('common.copy')}
          >
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="font-mono text-xs text-[#eceef6] break-all select-all">
          {inspect.id}
        </div>
      </div>

      {/* Image Card */}
      <div className="p-4 surface rounded-2xl border border-white/10 space-y-1.5">
        <div className="text-xs text-[#9ba0b5]">{t('containers.image')}</div>
        <div className="font-mono text-xs text-[#eceef6] break-all font-semibold">
          {inspect.config?.image || inspect.image || '—'}
        </div>
      </div>

      {/* State & Health */}
      <div className="p-4 surface rounded-2xl border border-white/10 space-y-2">
        <div className="text-xs text-[#9ba0b5]">{t('containers.statusHeader')}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
              isRunning
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {statusStr}
          </span>

          {state.health?.status && (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              {t('containers.healthBadge', { status: state.health.status })}
            </span>
          )}

          {state.exitCode !== undefined && state.exitCode !== 0 && (
            <span className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
              {t('containers.exitCodeBadge', { code: state.exitCode })}
            </span>
          )}
        </div>
      </div>
    </>
  );
};
