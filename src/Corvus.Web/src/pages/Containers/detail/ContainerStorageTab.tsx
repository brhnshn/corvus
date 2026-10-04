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
        <HardDrive className="w-4 h-4 text-[#d5d5dc]" />
        <h4 className="text-xs font-bold text-[#eceef6] uppercase tracking-wider">
          {t('containers.mountsTitle')}
        </h4>
      </div>

      {mounts.length === 0 ? (
        <div className="p-8 surface border border-white/10 rounded-2xl text-center text-xs text-[#9ba0b5]">
          {t('containers.noMounts')}
        </div>
      ) : (
        <div className="space-y-3">
          {mounts.map((mount, idx) => {
            const isRw = mount.rw ?? true;
            return (
              <div
                key={idx}
                className="p-4 surface border border-white/10 rounded-2xl space-y-3 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-white/[0.08] text-[#eceef6] border border-white/10 font-mono">
                      {mount.type || 'volume'}
                    </span>
                    {mount.name && (
                      <span className="text-xs font-bold text-[#eceef6] font-mono">
                        {mount.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isRw ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#34d399] bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        Okuma / Yazma
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#fbbf24] bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        Salt Okunur
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs font-mono items-center bg-white/[0.03] p-3.5 rounded-xl border border-white/10">
                  <div className="md:col-span-5 text-[#9ba0b5] break-all select-all">
                    <span className="text-[10px] text-[#9ba0b5]/70 block font-sans uppercase mb-0.5">
                      {t('containers.mountSource')}
                    </span>
                    {mount.source || '—'}
                  </div>

                  <div className="md:col-span-2 flex justify-center text-[#9ba0b5]">
                    <ArrowRight className="w-4 h-4 hidden md:block" />
                  </div>

                  <div className="md:col-span-5 text-[#eceef6] break-all select-all">
                    <span className="text-[10px] text-[#9ba0b5]/70 block font-sans uppercase mb-0.5">
                      {t('containers.mountDestination')}
                    </span>
                    {mount.destination || '—'}
                  </div>
                </div>

                {mount.propagation && (
                  <div className="text-[11px] text-[#9ba0b5] font-mono">
                    Yayılım (Propagation): <span className="text-[#eceef6]">{mount.propagation}</span>
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
