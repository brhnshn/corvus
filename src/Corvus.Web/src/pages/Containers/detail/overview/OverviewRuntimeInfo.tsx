import React from 'react';
import { useI18n } from '../../../../i18n';
import type { DockerContainerInspectInfo } from '../../../../types';
import type { getInspectConfig } from '../inspectHelpers';
import { formatInspectDate } from './overview.utils';

export interface OverviewRuntimeInfoProps {
  inspect: DockerContainerInspectInfo;
  config: ReturnType<typeof getInspectConfig>;
}

export const OverviewRuntimeInfo: React.FC<OverviewRuntimeInfoProps> = ({
  inspect,
  config,
}) => {
  const { t } = useI18n();

  const commandStr = config.cmd
    ? config.cmd.join(' ')
    : inspect.path
    ? `${inspect.path} ${(inspect.args || []).join(' ')}`
    : '—';
  const entrypointStr = config.entrypoint ? config.entrypoint.join(' ') : '—';

  return (
    <>
      {/* Execution Environment */}
      <div className="p-5 surface rounded-2xl border border-white/10 space-y-3">
        <h4 className="text-xs font-bold text-[#eceef6] uppercase tracking-wider">
          {t('containers.runtimeConfigTitle')}
        </h4>
        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-white/10 pb-2">
            <span className="text-[#9ba0b5]">{t('containers.command')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6] break-all">{commandStr}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-white/10 pb-2">
            <span className="text-[#9ba0b5]">{t('containers.entrypoint')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6] break-all">{entrypointStr}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-white/10 pb-2">
            <span className="text-[#9ba0b5]">{t('containers.workdir')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6]">{config.workingDir || '—'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
            <span className="text-[#9ba0b5]">{t('containers.user')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6]">{config.user || t('containers.defaultRootUser')}</span>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="p-5 surface rounded-2xl border border-white/10 space-y-3 text-xs">
        <h4 className="font-bold text-[#eceef6] uppercase tracking-wider">
          {t('containers.timestampsTitle')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[#9ba0b5] block mb-0.5">{t('containers.createdTime')}</span>
            <span className="text-[#eceef6] font-mono">{formatInspectDate(inspect.created)}</span>
          </div>
          <div>
            <span className="text-[#9ba0b5] block mb-0.5">{t('containers.startedTime')}</span>
            <span className="text-[#eceef6] font-mono">{formatInspectDate(inspect.state?.startedAt)}</span>
          </div>
          <div>
            <span className="text-[#9ba0b5] block mb-0.5">{t('containers.finishedTime')}</span>
            <span className="text-[#eceef6] font-mono">{formatInspectDate(inspect.state?.finishedAt)}</span>
          </div>
        </div>
      </div>
    </>
  );
};
