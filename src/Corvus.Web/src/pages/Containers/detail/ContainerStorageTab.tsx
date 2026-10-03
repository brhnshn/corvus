import React from 'react';
import { useI18n } from '../../../i18n';
import { HardDrive, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import type { DockerContainerInspectInfo } from '../../../types';

interface ContainerStorageTabProps {
  inspect: DockerContainerInspectInfo;
}

export const ContainerStorageTab: React.FC<ContainerStorageTabProps> = ({ inspect }) => {
  const { t } = useI18n();
  const mounts = inspect.mounts || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HardDrive className="w-4 h-4 text-amber-400" />
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {t('containers.mountsTitle')}
        </h4>
      </div>

      {mounts.length === 0 ? (
        <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
          {t('containers.noMounts')}
        </div>
      ) : (
        <div className="space-y-3">
          {mounts.map((mount, idx) => {
            const isRw = mount.rw ?? true;
            return (
              <div
                key={idx}
                className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                      {mount.type || 'volume'}
                    </span>
                    {mount.name && (
                      <span className="text-xs font-semibold text-slate-200 font-mono">
                        {mount.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isRw ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        Read / Write
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        Read-Only
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs font-mono items-center bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                  <div className="md:col-span-5 text-slate-400 break-all select-all">
                    <span className="text-[10px] text-slate-500 block font-sans uppercase mb-0.5">
                      {t('containers.mountSource')}
                    </span>
                    {mount.source || '—'}
                  </div>

                  <div className="md:col-span-2 flex justify-center text-slate-500">
                    <ArrowRight className="w-4 h-4 hidden md:block" />
                  </div>

                  <div className="md:col-span-5 text-slate-200 break-all select-all">
                    <span className="text-[10px] text-slate-500 block font-sans uppercase mb-0.5">
                      {t('containers.mountDestination')}
                    </span>
                    {mount.destination || '—'}
                  </div>
                </div>

                {mount.propagation && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    Propagation: <span className="text-slate-400">{mount.propagation}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
