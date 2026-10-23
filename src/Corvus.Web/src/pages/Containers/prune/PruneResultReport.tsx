import React from 'react';
import { Layers, Boxes, HardDrive, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DockerSelectivePruneResult } from '../../../types';
import { formatBytes } from '../../../utils/format';
import { useI18n } from '../../../i18n';

interface PruneResultReportProps {
  result: DockerSelectivePruneResult;
}

export const PruneResultReport: React.FC<PruneResultReportProps> = ({ result }) => {
  const { t } = useI18n();

  const breakdown = [
    { icon: Boxes, label: t('containers.pruneBreakdownContainers'), value: t('containers.pruneCountUnit', { count: result.deletedContainers.length }) },
    { icon: Layers, label: t('containers.pruneBreakdownImages'), value: t('containers.pruneCountUnit', { count: result.deletedImages.length }) },
    { icon: HardDrive, label: t('containers.pruneBreakdownVolumes'), value: t('containers.pruneCountUnit', { count: result.deletedVolumes.length }) },
    { icon: Cpu, label: t('containers.pruneCacheLabel'), value: result.buildCachePruned ? t('containers.pruneCacheCleaned') : '—' }
  ];

  return (
    <div className="space-y-6 text-center py-2 animate-in zoom-in-95 duration-200">
      <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-[#eceef6]">
          {t('containers.pruneSuccessTitle')}
        </h3>
        <p className="text-xs text-[#9ba0b5] mt-1">
          {t('containers.pruneTotalReclaimed')}
        </p>
        <div className="text-3xl font-extrabold text-[#34d399] font-mono mt-2">
          {formatBytes(result.totalSpaceReclaimed)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-left pt-2">
        {breakdown.map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-3.5 surface rounded-2xl border border-white/10">
            <div className="text-[11px] text-[#9ba0b5] flex items-center gap-1">
              <Icon className="w-3.5 h-3.5 text-[#d5d5dc]" />
              <span>{label}</span>
            </div>
            <div className="text-sm font-bold text-[#eceef6] mt-1 font-mono">
              {value}
            </div>
          </div>
        ))}
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left space-y-1">
          <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('containers.prunePartialErrorsTitle')}</span>
          </div>
          <ul className="text-[11px] text-amber-200/80 list-disc list-inside space-y-0.5">
            {result.errors.map((err, idx) => (
              <li key={idx} className="truncate">{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
