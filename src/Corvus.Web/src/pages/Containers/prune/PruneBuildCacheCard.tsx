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
      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
        selected 
          ? 'bg-white/[0.08] border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' 
          : 'surface border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/[0.06] text-[#eceef6] border border-white/10">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-[#eceef6]">
            {t('containers.pruneBuildCacheTitle')}
          </div>
          <div className="text-xs text-[#9ba0b5] mt-0.5">
            {cacheEntries.length} {t('containers.cacheEntriesFound')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-bold font-mono text-emerald-400">
            {formatBytes(totalCacheSize)}
          </div>
          <div className="text-[10px] text-[#9ba0b5]">
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
          className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#eceef6] focus:ring-0 focus:ring-offset-0 cursor-pointer"
        />
      </div>
    </div>
  );
};
