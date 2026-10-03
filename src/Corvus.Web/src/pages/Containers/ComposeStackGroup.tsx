import React from 'react';
import type { DockerContainer, ContainerStats } from '../../api/client';
import { ContainerList } from './ContainerList';
import { GroupSection } from '../../components/GroupSection';

interface ComposeStackGroupProps {
  groups: { name: string; items: DockerContainer[] }[];
  collapsed: Record<string, boolean>;
  onToggleCollapse: (groupName: string) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  dragOverGroup?: string | null;
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, groupName: string) => void;
  onDragLeave?: (groupName: string) => void;
  onDrop?: (e: React.DragEvent, groupName: string) => void;
  draggingId?: string | null;
  statsMap: Record<string, ContainerStats>;
  actionInProgress: { id: string; action: string } | null;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onOpenLogs: (id: string, name: string) => void;
  onOpenTerminal?: (id: string, name: string) => void;
  onEditTags?: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string) => void;
  isAdmin?: boolean;
}

export const ComposeStackGroup: React.FC<ComposeStackGroupProps> = ({
  groups,
  collapsed,
  onToggleCollapse,
  onRenameGroup,
  dragOverGroup,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggingId,
  statsMap,
  actionInProgress,
  onAction,
  onOpenLogs,
  onOpenTerminal,
  onEditTags,
  onInspect,
  selectedTag,
  onSelectTag,
  isAdmin = true
}) => {
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        if (group.items.length === 0) return null;

        return (
          <GroupSection
            key={group.name}
            title={group.name}
            count={group.items.length}
            isCollapsed={!!collapsed[group.name]}
            onToggleCollapse={() => onToggleCollapse(group.name)}
            onRenameGroup={onRenameGroup ? (newName) => onRenameGroup(group.name, newName) : undefined}
            isDragOver={dragOverGroup === group.name}
            onDragOver={(e) => onDragOver?.(e, group.name)}
            onDragLeave={() => onDragLeave?.(group.name)}
            onDrop={(e) => onDrop?.(e, group.name)}
          >
            <ContainerList
              items={group.items}
              statsMap={statsMap}
              actionInProgress={actionInProgress}
              onAction={onAction}
              onOpenLogs={onOpenLogs}
              onOpenTerminal={onOpenTerminal}
              onEditTags={onEditTags}
              onInspect={onInspect}
              selectedTag={selectedTag}
              onSelectTag={onSelectTag}
              isAdmin={isAdmin}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              draggingId={draggingId}
            />
          </GroupSection>
        );
      })}
    </div>
  );
};
