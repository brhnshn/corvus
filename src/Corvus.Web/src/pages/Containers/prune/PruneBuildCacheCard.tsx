import React from 'react';
import { Cpu } from 'lucide-react';
import type { DockerDfBuildCacheInfo } from '../../../types';
import { formatBytes } from '../../../utils/format';
import { useI18n } from '../../../i18n';

interface PruneBuildCacheCardProps {
  cacheEntries: DockerDfBuildCacheInfo[];
  selected: boolean;
  onToggle: (selected: boolean) => void;
}

export const PruneBuildCacheCard: React.FC<PruneBuildCacheCardProps> = ({
  cacheEntries,
  selected,
  onToggle
}) => {
  const { t } = useI18n();
  const totalCacheSize = cacheEntries.reduce((acc, curr) => acc + (curr.size || 0), 0);

  return (
    <div 
      onClick={() => onToggle(!selected)}
      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
        selected 
          ? 'bg-indigo-500/10 border-indigo-500/30' 
          : 'bg-[#131620] border-[#2a2e3f] hover:border-[#3b4258]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-[#e5e7eb]">
            {t('containers.pruneBuildCacheTitle')}
          </div>
          <div className="text-xs text-[#9ca3af] mt-0.5">
            {cacheEntries.length} {t('containers.cacheEntriesFound')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-bold font-mono text-emerald-400">
            {formatBytes(totalCacheSize)}
          </div>
          <div className="text-[10px] text-[#9ca3af]">
            {t('containers.pruneColReclaimable')}
          </div>
        </div>

        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(e.target.checked);
          }}
          className="w-4 h-4 rounded border-[#2a2e3f] bg-[#0f1117] text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
