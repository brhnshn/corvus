import React from 'react';
import { Sliders } from 'lucide-react';
import { useI18n } from '../../../../i18n';
import { formatBytes } from '../../../../utils/format';
import type { getInspectHostConfig } from '../inspectHelpers';

export interface OverviewLimitCardsProps {
  hostConfig: ReturnType<typeof getInspectHostConfig>;
  isAdmin: boolean;
  onOpenResourceLimitsModal?: () => void;
}

export const OverviewLimitCards: React.FC<OverviewLimitCardsProps> = ({
  hostConfig,
  isAdmin,
  onOpenResourceLimitsModal,
}) => {
  const { t } = useI18n();

  return (
    <>
      {/* Restart Policy */}
      <div className="p-4 surface rounded-2xl border border-white/10 space-y-1.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9ba0b5]">{t('containers.restartPolicyLabel')}</span>
          {isAdmin && onOpenResourceLimitsModal && (
            <button
              type="button"
              onClick={onOpenResourceLimitsModal}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{t('containers.editResourceLimitsBtn')}</span>
            </button>
          )}
        </div>
        <div className="text-xs font-bold text-[#eceef6]">
          {hostConfig.restartPolicy?.name ?? 'no'}
          {hostConfig.restartPolicy?.name === 'on-failure' && hostConfig.restartPolicy.maximumRetryCount ? ` (${hostConfig.restartPolicy.maximumRetryCount}x)` : ''}
        </div>
      </div>

      {/* Configured Resource Limits */}
      <div className="p-4 surface rounded-2xl border border-white/10 space-y-1.5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9ba0b5]">{t('containers.tabResources')}</span>
          {isAdmin && onOpenResourceLimitsModal && (
            <button
              type="button"
              onClick={onOpenResourceLimitsModal}
              className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{t('containers.editResourceLimitsBtn')}</span>
            </button>
          )}
        </div>
        <div className="text-xs font-mono text-[#eceef6] flex items-center gap-2">
          <span>
            CPU: {hostConfig.nanoCpus && hostConfig.nanoCpus > 0
              ? `${(hostConfig.nanoCpus / 1_000_000_000).toFixed(1)} ${t('containers.coresUnit')}`
              : t('containers.unlimited')}
          </span>
          <span className="text-[#9ba0b5]">•</span>
          <span>
            RAM: {hostConfig.memory && hostConfig.memory > 0
              ? formatBytes(hostConfig.memory)
              : t('containers.unlimited')}
          </span>
        </div>
      </div>
    </>
  );
};
