import React from 'react';
import {
  Layers,
  Cpu,
  Key,
  Network,
  HardDrive,
  FileText,
  Terminal as TerminalIcon
} from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ContainerDetailTab } from './types';

interface ContainerDetailTabsNavProps {
  activeTab: ContainerDetailTab;
  onSelectTab: (tab: ContainerDetailTab) => void;
  isAdmin: boolean;
}

export const ContainerDetailTabsNav: React.FC<ContainerDetailTabsNavProps> = ({
  activeTab,
  onSelectTab,
  isAdmin
}) => {
  const { t } = useI18n();

  const tabs = [
    { id: 'overview' as const, label: t('containers.tabOverview'), icon: Layers },
    { id: 'resources' as const, label: t('containers.tabResources'), icon: Cpu },
    { id: 'env' as const, label: t('containers.tabEnv'), icon: Key },
    { id: 'networking' as const, label: t('containers.tabNetworking'), icon: Network },
    { id: 'storage' as const, label: t('containers.tabStorage'), icon: HardDrive },
    { id: 'logs' as const, label: t('containers.tabLogs'), icon: FileText },
    ...(isAdmin ? [{ id: 'terminal' as const, label: t('containers.tabTerminal'), icon: TerminalIcon }] : [])
  ];

  return (
    <div className="glass rounded-[20px] p-[4px] flex gap-1 overflow-x-auto no-scrollbar shadow-xs">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[16px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? 'bg-white text-black shadow-xs font-bold'
                : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#9ba0b5]'}`} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
