import React from 'react';
import type { DockerContainer, ContainerStats } from '../../api/client';
import { ContainerRow } from './ContainerRow';

export interface ContainerListProps {
  items: DockerContainer[];
  statsMap: Record<string, ContainerStats>;
  actionInProgress: { id: string; action: string } | null;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onOpenSheet: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string) => void;
  isAdmin?: boolean;
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
}) => {
  return (
    <div className="space-y-2">
      {/* Masaüstü Sütun Başlıkları (Midnight v2 .th şeridi) */}
      <div className="hidden lg:grid grid-cols-[2.1fr_1.7fr_1.8fr_1.1fr_190px] items-center px-4.5 pb-2 text-[11px] font-mono font-semibold uppercase tracking-[0.8px] text-[#9ba0b5]">
        <span>İsim &amp; ID</span>
        <span>Kaynak (CPU / RAM)</span>
        <span>İmaj &amp; Port</span>
        <span>Durum</span>
        <span className="text-right">Aksiyon</span>
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
          />
        ))}
      </div>
    </div>
  );
};
