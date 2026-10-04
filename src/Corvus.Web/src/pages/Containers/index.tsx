import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { api, type DockerContainer, type ContainerStats } from '../../api/client';
import { RefreshCw, Boxes, Layers, List } from 'lucide-react';
import { ContainerList } from './ContainerList';
import { ComposeStackGroup } from './ComposeStackGroup';
import { ContainerLogsModal } from './ContainerLogsModal';
import { ContainerTerminalModal } from './ContainerTerminalModal';
import { ContainerTagsModal } from './ContainerTagsModal';
import { SystemPruneModal } from './SystemPruneModal';
import { ContainerDetailModal } from './detail/ContainerDetailModal';
import { ContainerActionSheet } from './ContainerActionSheet';
import { ContainersHeader } from './ContainersHeader';
import { ContainersStats } from './ContainersStats';
import { SearchInput } from '../../components/ui/SearchInput';
import { Segment } from '../../components/ui/Segment';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { tagHue } from '../../utils/tagHue';
import { useI18n } from '../../i18n';
import { useEntityGrouping, deriveSmartGroup } from '../../utils/grouping';
import { extractContainerTags } from './ContainerRow';

export interface ContainersPageProps {
  isAdmin?: boolean;
}

export const ContainersPage: React.FC<ContainersPageProps> = ({ isAdmin = true }) => {
  const { t } = useI18n();
  const toast = useToast();

  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, ContainerStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [actionInProgress, setActionInProgress] = useState<{ id: string; action: string } | null>(null);
  const [selectedLogsContainer, setSelectedLogsContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedTerminalContainer, setSelectedTerminalContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedInspectContainer, setSelectedInspectContainer] = useState<DockerContainer | null>(null);
  const [inspectInitialTab, setInspectInitialTab] = useState<'overview' | 'resources'>('overview');
  const [editingTagsContainer, setEditingTagsContainer] = useState<DockerContainer | null>(null);
  const [sheetContainer, setSheetContainer] = useState<DockerContainer | null>(null);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showPruneModal, setShowPruneModal] = useState(false);
  
  // Görünüm Modu: Düz Liste vs Gruplanmış Görünüm (Compose & Akıllı Gruplar)
  const [viewMode, setViewMode] = useState<'flat' | 'compose'>('flat');
  const isMountedRef = useRef(true);

  // Çalışan container'lar için canlı stats özetini al
  const fetchStatsBackground = useCallback(async (runningContainers: DockerContainer[]) => {
    if (runningContainers.length === 0) return;
    try {
      const summary = await api.getContainersStatsSummary();
      if (summary && isMountedRef.current) {
        setStatsMap(summary);
      }
    } catch {
      // stats arka planda sessizce geç
    }
  }, []);

  const loadContainers = useCallback(async (isManual = false) => {
    if (isManual && isMountedRef.current) setRefreshing(true);
    try {
      const data = await api.getContainers();
      if (!isMountedRef.current) return;
      setContainers(data);

      const runningContainers = data.filter((c) => c.State.toLowerCase() === 'running');
      fetchStatsBackground(runningContainers);
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Container listesi alınamadı', err);
        toast.error('Konteyner listesi alınamadı');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    }
  }, [fetchStatsBackground, toast]);

  useEffect(() => {
    isMountedRef.current = true;
    loadContainers();

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadContainers();
    }, 20000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadContainers();
    };

    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (type?.includes('container') && isMountedRef.current) {
        loadContainers();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
    };
  }, [loadContainers]);

  // Container Yaşam Döngüsü Eylemleri
  const handleAction = async (
    action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart',
    id: string,
    name: string
  ) => {
    const actionLabels: Record<string, string> = {
      start: 'başlatılıyor',
      stop: 'durduruluyor',
      pause: 'duraklatılıyor',
      unpause: 'devam ettiriliyor',
      restart: 'yeniden başlatılıyor',
    };

    setActionInProgress({ id, action });
    toast.info(`"${name}" ${actionLabels[action]}…`);

    try {
      if (action === 'start') await api.startContainer(id);
      else if (action === 'stop') await api.stopContainer(id);
      else if (action === 'pause') await api.pauseContainer(id);
      else if (action === 'unpause') await api.unpauseContainer(id);
      else if (action === 'restart') await api.restartContainer(id);

      // Optimistic update: yerel container durumunu anında yansıt
      setContainers((prev) =>
        prev.map((c) => {
          if (c.Id === id) {
            let newState = c.State;
            let newStatus = c.Status;
            if (action === 'start') {
              newState = 'running';
              newStatus = 'Up (just now)';
            } else if (action === 'stop') {
              newState = 'exited';
              newStatus = 'Exited (just now)';
            } else if (action === 'pause') {
              newState = 'paused';
              newStatus = 'Paused';
            } else if (action === 'unpause') {
              newState = 'running';
              newStatus = 'Up';
            }
            return { ...c, State: newState, Status: newStatus };
          }
          return c;
        })
      );

      toast.success(`"${name}" işlemi tamamlandı`);
      await loadContainers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İşlem gerçekleştirilemedi');
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

  // Filtrelenmiş konteynerler
  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      const rawName = c.Names?.[0] || c.Id;
      const cleanName = rawName.replace(/^\//, '').toLowerCase();
      const image = c.Image.toLowerCase();
      const q = search.toLowerCase();

      // Port araması
      const hasPort = c.Ports?.some(
        (p) =>
          String(p.PrivatePort).includes(q) ||
          (p.PublicPort && String(p.PublicPort).includes(q))
      );

      const matchesSearch = !q || cleanName.includes(q) || image.includes(q) || hasPort;

      // Etiket filtrelemesi
      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels);
      const matchesTag =
        !selectedTag || tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      // Durum filtrelemesi
      const state = c.State.toLowerCase();
      const matchesState =
        !selectedState ||
        (selectedState === 'running' && state === 'running') ||
        (selectedState === 'paused' && state === 'paused') ||
        (selectedState === 'stopped' && ['exited', 'dead', 'created'].includes(state));

      return matchesSearch && matchesTag && matchesState;
    });
  }, [containers, search, selectedTag, selectedState]);

  const handleTagsUpdated = (updatedTags: string[]) => {
    if (!editingTagsContainer) return;
    const containerId = editingTagsContainer.Id;
    setContainers((prev) =>
      prev.map((c) => (c.Id === containerId ? { ...c, tags: updatedTags } : c))
    );
    toast.success('Etiketler güncellendi');
  };

  // Ortak Gruplandırma & Compose Stack Motoru
  const {
    groups,
    collapsed,
    toggleCollapse,
    renameGroup,
    dragOverGroup,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
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
    storageKey: 'corvus_container_groups',
  });

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Başlık & Hızlı İşlemler */}
      <ContainersHeader
        onPruneClick={() => setShowPruneModal(true)}
        onRefreshClick={() => loadContainers(true)}
        refreshing={refreshing}
      />

      {/* 2. KPI İstatistik Şeridi */}
      <ContainersStats
        containers={containers}
        selectedState={selectedState}
        onFilterState={(st) => setSelectedState((prev) => (prev === st ? null : st))}
      />

      {/* 3. Arama Çubuğu & Görünüm Segmenti (Midnight v2 .tools) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap animate-rv">
        <div className="flex-1 min-w-[200px]">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="İsim, imaj veya port ara…"
          />
        </div>

        <Segment
          value={viewMode}
          onChange={(v) => setViewMode(v as 'flat' | 'compose')}
          options={[
            {
              value: 'flat',
              label: 'Liste',
              icon: <List className="w-3.5 h-3.5" />,
            },
            {
              value: 'compose',
              label: 'Gruplar',
              icon: <Layers className="w-3.5 h-3.5" />,
            },
          ]}
        />
      </div>

      {/* 4. Filtre Çipleri (Etiketler + Tümü) */}
      {(tagsWithCounts.length > 0 || selectedTag || selectedState) && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none animate-rv">
          <FilterChip
            label="Tümü"
            count={containers.length}
            selected={!selectedTag && !selectedState}
            onClick={() => {
              setSelectedTag(null);
              setSelectedState(null);
            }}
          />

          {tagsWithCounts.map(({ tag, count }) => {
            const h = tagHue(tag);
            return (
              <FilterChip
                key={tag}
                label={tag}
                count={count}
                dotColor={`hsl(${h} 80% 65%)`}
                selected={selectedTag?.toLowerCase() === tag.toLowerCase()}
                onClick={() =>
                  setSelectedTag((prev) => (prev?.toLowerCase() === tag.toLowerCase() ? null : tag))
                }
              />
            );
          })}
        </div>
      )}

      {/* Yükleniyor Durumu */}
      {loading && containers.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-[#9ba0b5]">
          <RefreshCw className="w-7 h-7 animate-spin text-[#d5d5dc] mb-3" />
          <span className="text-xs font-mono tracking-wider">{t('common.loading')}</span>
        </div>
      )}

      {/* Boş Durum */}
      {!loading && containers.length === 0 && (
        <EmptyState
          icon={<Boxes className="w-6 h-6" />}
          title={t('containers.noContainersFound')}
          description={t('containers.noContainersDesc')}
          action={
            <Button variant="secondary" onClick={() => loadContainers(true)}>
              Listeyi Yenile
            </Button>
          }
        />
      )}

      {/* Filtre Sonucu Boş Durumu */}
      {!loading && containers.length > 0 && filteredContainers.length === 0 && (
        <EmptyState
          title="Eşleşen konteyner bulunamadı"
          description="Arama kriterlerinize veya seçilen filtrelere uyan bir konteyner bulunmuyor."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedTag(null);
                setSelectedState(null);
              }}
            >
              Filtreleri Temizle
            </Button>
          }
        />
      )}

      {/* 5. Konteyner Listesi: Düz Liste vs Gruplanmış Görünüm */}
      {filteredContainers.length > 0 && viewMode === 'flat' && (
        <ContainerList
          items={filteredContainers}
          statsMap={statsMap}
          actionInProgress={actionInProgress}
          onAction={handleAction}
          onOpenSheet={(c) => setSheetContainer(c)}
          onInspect={(c) => setSelectedInspectContainer(c)}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          isAdmin={isAdmin}
        />
      )}

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
          statsMap={statsMap}
          actionInProgress={actionInProgress}
          onAction={handleAction}
          onOpenSheet={(c) => setSheetContainer(c)}
          onInspect={(c) => setSelectedInspectContainer(c)}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          isAdmin={isAdmin}
        />
      )}

      {/* Konteyner İşlemler Paneli (Midnight v2 Sheet) */}
      <ContainerActionSheet
        container={sheetContainer}
        isOpen={!!sheetContainer}
        onClose={() => setSheetContainer(null)}
        onAction={handleAction}
        onOpenLogs={(id, name) => setSelectedLogsContainer({ id, name })}
        onOpenTerminal={(id, name) => setSelectedTerminalContainer({ id, name })}
        onEditTags={(c) => setEditingTagsContainer(c)}
        onInspect={(c, tab = 'overview') => {
          setSelectedInspectContainer(c);
          setInspectInitialTab(tab);
        }}
        isAdmin={isAdmin}
      />

      {/* Konteyner Detay & Canlı Yapılandırma Modalı */}
      {selectedInspectContainer && (
        <ContainerDetailModal
          containerId={selectedInspectContainer.Id}
          containerSummary={selectedInspectContainer}
          initialTab={inspectInitialTab}
          liveStats={statsMap[selectedInspectContainer.Id]}
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
