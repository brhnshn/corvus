import React, { useEffect, useState, useMemo } from 'react';
import { api, type DockerContainer, type ContainerStats } from '../../api/client';
import { RefreshCw, Boxes, Layers, List, Trash2 } from 'lucide-react';
import { ContainerList } from './ContainerList';
import { ComposeStackGroup } from './ComposeStackGroup';
import { ContainerLogsModal } from './ContainerLogsModal';
import { ContainerTerminalModal } from './ContainerTerminalModal';
import { ContainerTagsModal, extractContainerTags } from './ContainerTagsModal';
import { SystemPruneModal } from './SystemPruneModal';
import { ContainerDetailModal } from './detail/ContainerDetailModal';
import { TagFilterBar } from '../../components/common/TagFilterBar';
import { useI18n } from '../../i18n';
import { useEntityGrouping, deriveSmartGroup } from '../../utils/grouping';

interface ContainersPageProps {
  isAdmin?: boolean;
}

export const ContainersPage: React.FC<ContainersPageProps> = ({ isAdmin = true }) => {
  const { t } = useI18n();
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, ContainerStats>>({});
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<{ id: string; action: string } | null>(null);
  const [selectedLogsContainer, setSelectedLogsContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedTerminalContainer, setSelectedTerminalContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedInspectContainer, setSelectedInspectContainer] = useState<DockerContainer | null>(null);
  const [editingTagsContainer, setEditingTagsContainer] = useState<DockerContainer | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showPruneModal, setShowPruneModal] = useState(false);
  
  // Görünüm Modu: Düz Liste vs Gruplanmış Görünüm (Compose & Akıllı Gruplar)
  const [viewMode, setViewMode] = useState<'flat' | 'compose'>('compose');

  // Çalışan container'lar için canlı stats özetini tek bir batch sorgu ile al
  const fetchStatsBackground = async (runningContainers: DockerContainer[]) => {
    if (runningContainers.length === 0) return;
    try {
      const summary = await api.getContainersStatsSummary();
      if (summary) {
        setStatsMap(summary);
      }
    } catch {
      // stats alınamazsa sessizce geç
    }
  };

  const loadContainers = async () => {
    try {
      const data = await api.getContainers();
      setContainers(data);

      const runningContainers = data.filter(c => c.State.toLowerCase() === 'running');
      fetchStatsBackground(runningContainers);
    } catch (err) {
      console.error('Container listesi alınamadı', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const safeLoadContainers = async () => {
      try {
        const data = await api.getContainers();
        if (!isMounted) return;
        setContainers(data);
        setLoading(false);

        const runningContainers = data.filter(c => c.State.toLowerCase() === 'running');
        if (runningContainers.length === 0) return;
        const summary = await api.getContainersStatsSummary();
        if (!isMounted) return;
        if (summary) {
          setStatsMap(summary);
        }
      } catch (err) {
        if (isMounted) console.error('Container listesi alınamadı', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    safeLoadContainers();

    const interval = setInterval(() => {
      if (!document.hidden && isMounted) safeLoadContainers();
    }, 25000);

    const onVisible = () => {
      if (!document.hidden && isMounted) safeLoadContainers();
    };

    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (type?.includes('container') && isMounted) {
        safeLoadContainers();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
    };
  }, []);

  // Container Yaşam Döngüsü Eylemleri
  const handleAction = async (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => {
    const actionLabels: Record<string, string> = {
      start: t('containers.actionStart'),
      stop: t('containers.actionStop'),
      pause: t('containers.actionPause'),
      unpause: t('containers.actionResume'),
      restart: t('containers.actionRestart')
    };

    if (action === 'stop' || action === 'restart') {
      if (!confirm(t('containers.confirmAction', { action: actionLabels[action], name }))) return;
    }

    setActionInProgress({ id, action });
    try {
      if (action === 'start') await api.startContainer(id);
      else if (action === 'stop') await api.stopContainer(id);
      else if (action === 'pause') await api.pauseContainer(id);
      else if (action === 'unpause') await api.unpauseContainer(id);
      else if (action === 'restart') await api.restartContainer(id);

      // Optimistic update: yerel container durumunu anında yansıt
      setContainers(prev => prev.map(c => {
        if (c.Id === id) {
          let newState = c.State;
          let newStatus = c.Status;
          if (action === 'start') { newState = 'running'; newStatus = 'Up (just now)'; }
          else if (action === 'stop') { newState = 'exited'; newStatus = 'Exited (just now)'; }
          else if (action === 'pause') { newState = 'paused'; newStatus = 'Paused'; }
          else if (action === 'unpause') { newState = 'running'; newStatus = 'Up'; }
          return { ...c, State: newState, Status: newStatus };
        }
        return c;
      }));

      await loadContainers();
    } catch (err: unknown) {
      alert(`${t('common.error')}: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Dinamik etiket sayıları ve filtreleme
  const tagsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of containers) {
      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels);
      for (const t of tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [containers]);

  const filteredContainers = useMemo(() => {
    if (!selectedTag) return containers;
    const lower = selectedTag.toLowerCase();
    return containers.filter((c) => {
      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels);
      return tags.some((t) => t.toLowerCase() === lower);
    });
  }, [containers, selectedTag]);

  const handleTagsUpdated = (updatedTags: string[]) => {
    if (!editingTagsContainer) return;
    const containerId = editingTagsContainer.Id;
    setContainers((prev) =>
      prev.map((c) => (c.Id === containerId ? { ...c, tags: updatedTags } : c))
    );
  };

  // Ortak Gruplandırma & Manuel Düzenleme Motoru
  const {
    groups,
    collapsed,
    toggleCollapse,
    renameGroup,
    draggingId,
    dragOverGroup,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useEntityGrouping<DockerContainer>({
    items: filteredContainers,
    getId: (c) => c.Id,
    getName: (c) => c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
    getCategory: (c) => {
      const composeProject = c.Labels?.['com.docker.compose.project'];
      const rawName = c.Names?.[0] || c.Id.slice(0, 12);
      const cleanName = rawName.replace(/^\//, '');
      return deriveSmartGroup(cleanName, composeProject);
    },
    storageKey: 'corvus_container_groups'
  });

  return (
    <div className="space-y-6">
      {/* Başlık ve Görünüm Kontrolleri */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#e5e7eb]">{t('containers.title')}</h1>
          <p className="text-sm text-[#9ca3af]">{t('containers.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Görünüm Seçici (Düz Liste vs Compose / Akıllı Gruplar) */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#1a1d29] border border-[#2a2e3f]">
            <button
              onClick={() => setViewMode('compose')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'compose' ? 'bg-[#0f1117] text-white shadow-sm' : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gruplar</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'flat' ? 'bg-[#0f1117] text-white shadow-sm' : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t('containers.viewFlat')}</span>
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowPruneModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs font-medium text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
              title={t('containers.systemPrune')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('containers.systemPrune')}</span>
            </button>
          )}

          <button
            onClick={loadContainers}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2e3f] bg-[#1a1d29] text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('common.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Etiket Filtreleme Barı */}
      {containers.length > 0 && tagsWithCounts.length > 0 && (
        <TagFilterBar
          tagsWithCounts={tagsWithCounts}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          totalCount={containers.length}
        />
      )}

      {loading && containers.length === 0 && (
        <div className="flex items-center justify-center h-64 text-[#9ca3af]">
          <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
          <span>{t('common.loading')}</span>
        </div>
      )}

      {!loading && containers.length === 0 && (
        <div className="p-12 rounded-2xl bg-[#1a1d29] border border-[#2a2e3f] text-center max-w-md mx-auto space-y-3">
          <Boxes className="w-12 h-12 text-[#9ca3af]/40 mx-auto" />
          <h3 className="text-base font-semibold text-[#e5e7eb]">{t('containers.noContainersFound')}</h3>
          <p className="text-xs text-[#9ca3af]">{t('containers.noContainersDesc')}</p>
        </div>
      )}

      {/* Düz Liste Görünümü */}
      {filteredContainers.length > 0 && viewMode === 'flat' && (
        <ContainerList
          items={filteredContainers}
          statsMap={statsMap}
          actionInProgress={actionInProgress}
          onAction={handleAction}
          onOpenLogs={(id, name) => setSelectedLogsContainer({ id, name })}
          onOpenTerminal={(id, name) => setSelectedTerminalContainer({ id, name })}
          onEditTags={(c) => setEditingTagsContainer(c)}
          onInspect={(c) => setSelectedInspectContainer(c)}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          isAdmin={isAdmin}
        />
      )}

      {/* Akıllı Gruplar & Compose Stack Görünümü */}
      {filteredContainers.length > 0 && viewMode === 'compose' && (
        <ComposeStackGroup
          groups={groups}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onRenameGroup={renameGroup}
          dragOverGroup={dragOverGroup}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          draggingId={draggingId}
          statsMap={statsMap}
          actionInProgress={actionInProgress}
          onAction={handleAction}
          onOpenLogs={(id, name) => setSelectedLogsContainer({ id, name })}
          onOpenTerminal={(id, name) => setSelectedTerminalContainer({ id, name })}
          onEditTags={(c) => setEditingTagsContainer(c)}
          onInspect={(c) => setSelectedInspectContainer(c)}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          isAdmin={isAdmin}
        />
      )}

      {/* Etiket filtresi sonucu eşleşen container bulunamadığında */}
      {!loading && containers.length > 0 && filteredContainers.length === 0 && (
        <div className="p-8 rounded-2xl bg-[#1a1d29] border border-[#2a2e3f] text-center max-w-md mx-auto space-y-3">
          <Boxes className="w-10 h-10 text-[#9ca3af]/40 mx-auto" />
          <h3 className="text-sm font-semibold text-[#e5e7eb]">
            {t('containers.noMatchingContainers') || 'Seçilen etikete uygun konteyner bulunamadı'}
          </h3>
          <button
            onClick={() => setSelectedTag(null)}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            {t('containers.clearFilter') || 'Filtreyi Temizle'}
          </button>
        </div>
      )}

      {/* Konteyner Detay & Canlı Yapılandırma Modalı */}
      {selectedInspectContainer && (
        <ContainerDetailModal
          containerId={selectedInspectContainer.Id}
          containerSummary={selectedInspectContainer}
          isOpen={!!selectedInspectContainer}
          isAdmin={isAdmin}
          onClose={() => setSelectedInspectContainer(null)}
          onOpenTerminal={(id, name) => setSelectedTerminalContainer({ id, name })}
          onOpenLogs={(id, name) => setSelectedLogsContainer({ id, name })}
          onContainerActionSuccess={() => loadContainers()}
        />
      )}

      {/* Canlı Log Modalı */}
      {selectedLogsContainer && (
        <ContainerLogsModal
          containerId={selectedLogsContainer.id}
          containerName={selectedLogsContainer.name}
          onClose={() => setSelectedLogsContainer(null)}
        />
      )}

      {/* Canlı Web Terminal (Exec) Modalı */}
      {selectedTerminalContainer && (
        <ContainerTerminalModal
          containerId={selectedTerminalContainer.id}
          containerName={selectedTerminalContainer.name}
          onClose={() => setSelectedTerminalContainer(null)}
        />
      )}

      {/* Docker Sistem ve Disk Temizliği Modalı */}
      {showPruneModal && (
        <SystemPruneModal
          onClose={() => setShowPruneModal(false)}
          onSuccess={() => loadContainers()}
        />
      )}

      {/* Konteyner Etiketleri Düzenleme Modalı */}
      {editingTagsContainer && (
        <ContainerTagsModal
          container={editingTagsContainer}
          onClose={() => setEditingTagsContainer(null)}
          onSuccess={handleTagsUpdated}
        />
      )}
    </div>
  );
};

export default ContainersPage;
