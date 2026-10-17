import React from 'react';
import { FileText, Info, Activity, Terminal } from 'lucide-react';
import type { DockerContainer } from '../../types';
import { useI18n } from '../../i18n';

export interface ContainerQuickActionsProps {
  container: DockerContainer;
  onInspect?: (container: DockerContainer, defaultTab?: string) => void;
  isAdmin?: boolean;
}

export const ContainerQuickActions: React.FC<ContainerQuickActionsProps> = ({
  container,
  onInspect,
  isAdmin = true
}) => {
  const { t } = useI18n();
  const isRunning = container.State?.toLowerCase() === 'running';

  const handleClick = (e: React.MouseEvent, tab: string) => {
    e.stopPropagation();
    onInspect?.(container, tab);
  };

  return (
    <div
      className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Canlı Loglar */}
      <button
        type="button"
        onClick={(e) => handleClick(e, 'logs')}
        title={t('containers.tabLogs')}
        aria-label={t('containers.tabLogs')}
        className="p-1.5 rounded-lg text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
      >
        <FileText className="w-3.5 h-3.5" />
      </button>

      {/* 2. Konteyner Detayı / İncele */}
      <button
        type="button"
        onClick={(e) => handleClick(e, 'overview')}
        title={t('containers.quickOverviewTitle')}
        aria-label={t('containers.tabOverview')}
        className="p-1.5 rounded-lg text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {/* 3. Canlı Telemetri & İstatistikler */}
      <button
        type="button"
        onClick={(e) => handleClick(e, 'resources')}
        title={t('containers.tabResources')}
        aria-label={t('containers.tabResources')}
        className="p-1.5 rounded-lg text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
      >
        <Activity className="w-3.5 h-3.5" />
      </button>

      {/* 4. Web Terminali (Yalnızca çalışan konteyner ve admin için) */}
      {isAdmin && isRunning && (
        <button
          type="button"
          onClick={(e) => handleClick(e, 'terminal')}
          title={t('containers.quickTerminalTitle')}
          aria-label={t('containers.terminalTitle')}
          className="p-1.5 rounded-lg text-[#9ba0b5] hover:text-emerald-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
