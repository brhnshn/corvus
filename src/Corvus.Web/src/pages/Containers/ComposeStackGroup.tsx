import React, { useState } from 'react';
import { RotateCw, Play, Square, Loader2, FileCode2 } from 'lucide-react';
import type { DockerContainer, ContainerStats } from '../../api/client';
import { ContainerList } from './ContainerList';
import { GroupSection } from '../../components/GroupSection';

export interface ComposeStackGroupProps {
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
  onOpenSheet: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer) => void;
  selectedTag?: string | null;
  onSelectTag?: (tag: string) => void;
  isAdmin?: boolean;
  onOpenComposeConfig?: (projectName: string) => void;
  onOpenImageUpdate?: (container: DockerContainer) => void;
  updatesMap?: Record<string, boolean>;
}

export const ComposeStackGroup: React.FC<ComposeStackGroupProps> = ({
  groups,
  collapsed,
  onToggleCollapse,
  onRenameGroup,
  dragOverGroup,
  onDragStart: _onDragStart,
  onDragEnd: _onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  draggingId: _draggingId,
  statsMap,
  actionInProgress,
  onAction,
  onOpenSheet,
  onInspect,
  onSelectTag,
  isAdmin = true,
  onOpenComposeConfig,
  onOpenImageUpdate,
  updatesMap,
}) => {
  const [stackBusy, setStackBusy] = useState<string | null>(null);

  const handleStackAction = async (action: 'start' | 'stop' | 'restart', groupName: string, items: DockerContainer[]) => {
    setStackBusy(`${groupName}:${action}`);
    try {
      for (const item of items) {
        const cleanName = item.Names?.[0]?.replace(/^\//, '') || item.Id.slice(0, 12);
        onAction(action, item.Id, cleanName);
      }
    } finally {
      setTimeout(() => setStackBusy(null), 1200);
    }
  };

  return (
    <div className="space-y-3.5">
      {groups.map((group) => {
        if (group.items.length === 0) return null;

        const isGroupBusy = stackBusy?.startsWith(`${group.name}:`);

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
            headerActions={
              isAdmin && (
                <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {/* Restart Stack */}
                  <button
                    type="button"
                    disabled={isGroupBusy}
                    onClick={() => handleStackAction('restart', group.name, group.items)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-[#9ba0b5] hover:text-amber-300 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                    title={`${group.name} Stack'ini Yeniden Başlat`}
                  >
                    {isGroupBusy ? (
                      <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                    ) : (
                      <RotateCw className="w-3 h-3" />
                    )}
                  </button>

                  {/* Start Stack */}
                  <button
                    type="button"
                    disabled={isGroupBusy}
                    onClick={() => handleStackAction('start', group.name, group.items)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-500/20 text-[#9ba0b5] hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
                    title={`${group.name} Stack'ini Başlat`}
                  >
                    <Play className="w-3 h-3" />
                  </button>

                  {/* Stack YAML Config Editor */}
                  {onOpenComposeConfig && (
                    <button
                      type="button"
                      onClick={() => onOpenComposeConfig(group.name)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-indigo-500/20 text-[#9ba0b5] hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer"
                      title={`${group.name} Stack YAML Yapılandırması`}
                    >
                      <FileCode2 className="w-3 h-3" />
                    </button>
                  )}

                  {/* Stop Stack */}
                  <button
                    type="button"
                    disabled={isGroupBusy}
                    onClick={() => handleStackAction('stop', group.name, group.items)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-[#9ba0b5] hover:text-red-300 border border-white/5 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
                    title={`${group.name} Stack'ini Durdur`}
                  >
                    <Square className="w-3 h-3" />
                  </button>
                </div>
              )
            }
          >
            <ContainerList
              items={group.items}
              statsMap={statsMap}
              actionInProgress={actionInProgress}
              onAction={onAction}
              onOpenSheet={onOpenSheet}
              onInspect={onInspect}
              onSelectTag={onSelectTag}
              isAdmin={isAdmin}
              onOpenImageUpdate={onOpenImageUpdate}
              updatesMap={updatesMap}
            />
          </GroupSection>
        );
      })}
    </div>
  );
};
