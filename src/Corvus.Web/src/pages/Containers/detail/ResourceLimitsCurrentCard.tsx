import React from 'react';
import { useI18n } from '../../../i18n';
import { formatBytes } from '../../../utils/format';

interface ResourceLimitsCurrentCardProps {
  activeNanoCpus: number;
  activeMemoryBytes: number;
  activePolicy: string;
  activeRetries: string;
}

// Current Active Configuration Card
export const ResourceLimitsCurrentCard: React.FC<ResourceLimitsCurrentCardProps> = ({
  activeNanoCpus,
  activeMemoryBytes,
  activePolicy,
  activeRetries,
}) => {
  const { t } = useI18n();

  return (
    <div className="p-3.5 surface rounded-2xl border border-[var(--border-hairline)] space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {t('containers.currentLimitsHeader')}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border-hairline)]">
          <span className="text-[11px] text-[var(--text-muted)] block mb-0.5">
            {t('containers.currentCpu')}
          </span>
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {activeNanoCpus > 0
              ? `${(activeNanoCpus / 1_000_000_000).toFixed(1)} ${t('containers.coresUnit')}`
              : t('containers.unlimited')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border-hairline)]">
          <span className="text-[11px] text-[var(--text-muted)] block mb-0.5">
            {t('containers.currentMemory')}
          </span>
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {activeMemoryBytes > 0 ? formatBytes(activeMemoryBytes) : t('containers.unlimited')}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[var(--border-hairline)]">
          <span className="text-[11px] text-[var(--text-muted)] block mb-0.5">
            {t('containers.currentRestartPolicy')}
          </span>
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {activePolicy}
            {activePolicy === 'on-failure' && activeRetries !== '0' ? ` (${activeRetries}x)` : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
