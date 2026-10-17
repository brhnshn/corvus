import React from 'react';
import type { DockerContainer, ContainerStats } from '../../api/client';
import { ContainerRow } from './ContainerRow';
import { useI18n } from '../../i18n';

export interface ContainerListProps {
  items: DockerContainer[];
  statsMap: Record<string, ContainerStats>;
  actionInProgress: { id: string; action: string } | null;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onOpenSheet: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer, defaultTab?: string) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string) => void;
  isAdmin?: boolean;
  onOpenImageUpdate?: (container: DockerContainer) => void;
  onDeploy?: (container: DockerContainer) => void;
  onDelete?: (container: DockerContainer) => void;
  updatesMap?: Record<string, boolean>;
}

export const ContainerList: React.FC<ContainerListProps> = ({
  items,
  statsMap,
  actionInProgress,
  onAction,
  onOpenSheet,
  onInspect,
  onSelectTag,
  isAdmin = true,
  onOpenImageUpdate,
  onDeploy,
  onDelete,
  updatesMap = {},
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      {/* Masaüstü Sütun Başlıkları (Midnight v2 .th şeridi) */}
      <div className="hidden lg:grid grid-cols-[2.1fr_1.5fr_1.8fr_1fr_210px] items-center px-4.5 pb-2 text-[11px] font-mono font-semibold uppercase tracking-[0.8px] text-[#9ba0b5]">
        <span>{t('containers.colNameAndQuickActions')}</span>
        <span>{t('containers.colResources')}</span>
        <span>{t('containers.colImageAndPorts')}</span>
        <span>{t('containers.colStatus')}</span>
        <span className="text-right">{t('containers.colAction')}</span>
      </div>

      {/* Konteyner Satırları */}
      <div className="space-y-2">
        {items.map((container) => (
          <ContainerRow
            key={container.Id}
            container={container}
            stats={statsMap[container.Id]}
            actionInProgress={actionInProgress?.id === container.Id}
            onAction={onAction}
            onOpenSheet={onOpenSheet}
            onInspect={onInspect}
            onSelectTag={onSelectTag}
            isAdmin={isAdmin}
            onOpenImageUpdate={onOpenImageUpdate}
            onDeploy={onDeploy}
            onDelete={onDelete}
            hasUpdate={updatesMap[container.Id]}
          />
        ))}
      </div>
    </div>
  );
};
