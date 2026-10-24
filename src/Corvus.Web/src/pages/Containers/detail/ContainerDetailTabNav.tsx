import React from 'react';
import { Layers, Key, Network, HardDrive, Cpu, Rocket } from 'lucide-react';
import { useI18n } from '../../../i18n';
import type { DetailTabType } from './useContainerInspect';

export interface ContainerDetailTabNavProps {
  activeTab: DetailTabType;
  onChange: (tab: DetailTabType) => void;
  envCount: number;
  portsCount: number;
  mountsCount: number;
}

export const ContainerDetailTabNav: React.FC<ContainerDetailTabNavProps> = ({
  activeTab,
  onChange,
  envCount,
  portsCount,
  mountsCount,
}) => {
  const { t } = useI18n();

  return (
    <div className="tabs border-b border-[var(--border-hairline)] pb-2 overflow-x-auto no-scrollbar">
      <button
        type="button"
        onClick={() => onChange('overview')}
        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>{t('containers.tabOverview')}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('env')}
        className={`tab ${activeTab === 'env' ? 'active' : ''}`}
      >
        <Key className="w-3.5 h-3.5" />
        <span>{t('containers.tabEnv')}</span>
        {envCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
            {envCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onChange('networking')}
        className={`tab ${activeTab === 'networking' ? 'active' : ''}`}
      >
        <Network className="w-3.5 h-3.5" />
        <span>{t('containers.tabNetworking')}</span>
        {portsCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
            {portsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onChange('storage')}
        className={`tab ${activeTab === 'storage' ? 'active' : ''}`}
      >
        <HardDrive className="w-3.5 h-3.5" />
        <span>{t('containers.tabStorage')}</span>
        {mountsCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
            {mountsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onChange('resources')}
        className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
      >
        <Cpu className="w-3.5 h-3.5" />
        <span>{t('containers.tabResources')}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('deployments')}
        className={`tab ${activeTab === 'deployments' ? 'active' : ''}`}
      >
        <Rocket className="w-3.5 h-3.5 text-indigo-400" />
        <span>{t('containers.deployHistoryTab')}</span>
      </button>
    </div>
  );
};
