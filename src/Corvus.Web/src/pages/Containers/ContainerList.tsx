import React from 'react';
import { Plus } from 'lucide-react';
import type { DockerContainer, ContainerStats } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { ContainerStatsBadges } from './ContainerStatsBadges';
import { ContainerActionButtons } from './ContainerActionButtons';
import { TagBadge } from '../../components/common/TagBadge';
import { useI18n } from '../../i18n';

interface ContainerListProps {
  items: DockerContainer[];
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
  onDragStart?: (e: React.DragEvent, id: string) => void;
  onDragEnd?: () => void;
  draggingId?: string | null;
}

function extractContainerTags(labels?: Record<string, string>): string[] {
  if (!labels) return [];
  const tags: string[] = [];
  if (labels['corvus.tags']) {
    tags.push(...labels['corvus.tags'].split(',').map(s => s.trim()).filter(Boolean));
  }
  if (labels['environment']) tags.push(labels['environment'].trim());
  else if (labels['env']) tags.push(labels['env'].trim());
  if (labels['com.docker.compose.project']) tags.push(labels['com.docker.compose.project'].trim());
  return Array.from(new Set(tags));
}

export const ContainerList: React.FC<ContainerListProps> = ({
  items,
  statsMap,
  actionInProgress,
  onAction,
  onOpenLogs,
  onOpenTerminal,
  onEditTags,
  onInspect,
  selectedTag,
  onSelectTag,
  isAdmin = true,
  onDragStart,
  onDragEnd,
  draggingId
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      {/* Mobil Görünüm */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((c) => {
          const rawName = c.Names?.[0] || c.Id.slice(0, 12);
          const cleanName = rawName.replace(/^\//, '');
          const shortId = c.Id.slice(0, 12);
          const isRunning = c.State.toLowerCase() === 'running';
          const isPaused = c.State.toLowerCase() === 'paused';
          const isDragging = draggingId === c.Id;
          const containerTags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels);

          return (
            <div 
              key={c.Id} 
              draggable={!!onDragStart}
              onDragStart={(e) => onDragStart?.(e, c.Id)}
              onDragEnd={onDragEnd}
              className={`p-4 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-3 transition-opacity ${
                isDragging ? 'opacity-30 border-indigo-500/50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 
                      onClick={() => onInspect?.(c)}
                      className="font-semibold text-sm text-[#e5e7eb] hover:text-indigo-400 cursor-pointer transition-colors"
                    >
                      {cleanName}
                    </h3>
                    {containerTags.map((tag) => (
                      <TagBadge 
                        key={tag} 
                        tag={tag} 
                        size="sm" 
                        isActive={selectedTag?.toLowerCase() === tag.toLowerCase()}
                        onClick={onSelectTag ? () => onSelectTag(tag) : undefined}
                      />
                    ))}
                    {isAdmin && onEditTags && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTags(c);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#9ca3af] hover:text-indigo-400 px-1.5 py-0.5 rounded border border-dashed border-[#2a2e3f] hover:border-indigo-500/50 bg-[#0f1117] transition-all cursor-pointer"
                        title={t('containers.manageTags') || 'Etiketleri Düzenle'}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>{t('containers.addTag') || 'Etiket'}</span>
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-mono text-[#9ca3af] mt-0.5">{shortId}</div>
                </div>
                <StatusBadge status={isRunning ? 'healthy' : isPaused ? 'degraded' : 'down'} />
              </div>

              <ContainerStatsBadges stats={statsMap[c.Id]} isRunning={isRunning} />

              <div className="text-xs font-mono text-[#9ca3af] break-all bg-[#0f1117] p-2 rounded-lg border border-[#2a2e3f]/60">
                <span className="text-[#9ca3af]/60 block text-[10px] uppercase font-sans">{t('containers.image')}</span>
                {c.Image}
              </div>

              {c.Ports && c.Ports.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.Ports.map((p, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-[#0f1117] border border-[#2a2e3f] text-[11px] font-mono text-[#9ca3af]">
                      {p.PublicPort ? `${p.PublicPort}:` : ''}{p.PrivatePort}/{p.Type || 'tcp'}
                    </span>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-[#2a2e3f]/60">
                <ContainerActionButtons
                  container={c}
                  cleanName={cleanName}
                  isRunning={isRunning}
                  isPaused={isPaused}
                  actionInProgress={actionInProgress}
                  onAction={onAction}
                  onOpenLogs={onOpenLogs}
                  onOpenTerminal={onOpenTerminal}
                  onEditTags={onEditTags}
                  onInspect={onInspect}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Masaüstü Tablo Görünümü */}
      <div className="hidden md:block rounded-xl bg-[#1a1d29] border border-[#2a2e3f] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0f1117]/60 text-xs uppercase font-mono text-[#9ca3af] border-b border-[#2a2e3f]">
              <tr>
                <th className="px-5 py-3">{t('containers.nameAndId')}</th>
                <th className="px-5 py-3">{t('containers.resourceUsage')}</th>
                <th className="px-5 py-3">{t('containers.imageAndPort')}</th>
                <th className="px-5 py-3">{t('containers.statusHeader')}</th>
                <th className="px-5 py-3 text-right">{t('containers.actionsHeader')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2e3f]/60">
              {items.map((c) => {
                const rawName = c.Names?.[0] || c.Id.slice(0, 12);
                const cleanName = rawName.replace(/^\//, '');
                const shortId = c.Id.slice(0, 12);
                const isRunning = c.State.toLowerCase() === 'running';
                const isPaused = c.State.toLowerCase() === 'paused';
                const isDragging = draggingId === c.Id;
                const containerTags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels);

                return (
                  <tr 
                    key={c.Id} 
                    draggable={!!onDragStart}
                    onDragStart={(e) => onDragStart?.(e, c.Id)}
                    onDragEnd={onDragEnd}
                    className={`hover:bg-[#1e2130]/50 transition-colors ${
                      onDragStart ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${isDragging ? 'opacity-30 bg-indigo-500/10' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#e5e7eb] flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onInspect?.(c)}
                          className="font-medium text-[#e5e7eb] hover:text-indigo-400 text-left transition-colors cursor-pointer"
                        >
                          {cleanName}
                        </button>
                        {containerTags.map((tag) => (
                          <TagBadge 
                            key={tag} 
                            tag={tag} 
                            size="sm" 
                            isActive={selectedTag?.toLowerCase() === tag.toLowerCase()}
                            onClick={onSelectTag ? () => onSelectTag(tag) : undefined}
                          />
                        ))}
                        {isAdmin && onEditTags && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTags(c);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-[#9ca3af] hover:text-indigo-400 px-1.5 py-0.5 rounded border border-dashed border-[#2a2e3f] hover:border-indigo-500/50 bg-[#0f1117] transition-all cursor-pointer"
                            title={t('containers.manageTags') || 'Etiketleri Düzenle'}
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>{t('containers.addTag') || 'Etiket'}</span>
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[#9ca3af]">{shortId}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <ContainerStatsBadges stats={statsMap[c.Id]} isRunning={isRunning} />
                      {!isRunning || !statsMap[c.Id] ? <span className="text-xs text-[#9ca3af]/50">—</span> : null}
                    </td>

                    <td className="px-5 py-3.5 text-xs font-mono text-[#9ca3af] max-w-xs truncate">
                      <div>{c.Image}</div>
                      {c.Ports && c.Ports.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.Ports.slice(0, 2).map((p, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-[#0f1117] border border-[#2a2e3f]">
                              {p.PublicPort ? `${p.PublicPort}:` : ''}{p.PrivatePort}/{p.Type || 'tcp'}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={isRunning ? 'healthy' : isPaused ? 'degraded' : 'down'} />
                        <span className="text-[11px] text-[#9ca3af]">{c.Status}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <ContainerActionButtons
                        container={c}
                        cleanName={cleanName}
                        isRunning={isRunning}
                        isPaused={isPaused}
                        actionInProgress={actionInProgress}
                        onAction={onAction}
                        onOpenLogs={onOpenLogs}
                        onOpenTerminal={onOpenTerminal}
                        onEditTags={onEditTags}
                        onInspect={onInspect}
                        isAdmin={isAdmin}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
