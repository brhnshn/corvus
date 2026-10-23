import React from 'react';
import { Layers, Boxes, HardDrive, Cpu } from 'lucide-react';
import { useI18n } from '../../../i18n';
import type { PruneTab } from './prune.utils';

interface PruneTabBarProps {
  activeTab: PruneTab;
  onTabChange: (tab: PruneTab) => void;
  counts: Record<PruneTab, number>;
}

export const PruneTabBar: React.FC<PruneTabBarProps> = ({
  activeTab,
  onTabChange,
  counts
}) => {
  const { t } = useI18n();

  const tabs = [
    { id: 'containers' as const, icon: Boxes, label: t('containers.pruneContainersOption') },
    { id: 'images' as const, icon: Layers, label: t('containers.pruneImagesOption') },
    { id: 'volumes' as const, icon: HardDrive, label: t('containers.pruneOrphanedVolumesTab') },
    { id: 'buildCache' as const, icon: Cpu, label: t('containers.pruneBuildCacheOption') }
  ];

  return (
    <div className="flex items-center gap-1.5 p-1 surface border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === id
              ? 'bg-white text-black shadow-sm font-bold'
              : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{label}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === id ? 'bg-black/10 text-black' : 'bg-white/[0.06] text-[#9ba0b5]'
          }`}>
            {counts[id]}
          </span>
        </button>
      ))}
    </div>
  );
};
