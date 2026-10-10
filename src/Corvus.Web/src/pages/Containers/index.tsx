import React from 'react';
import type { DockerContainer } from '../../api/client';
import { RefreshCw, Boxes, Layers, List } from 'lucide-react';
import { ContainerList } from './ContainerList';
import { ComposeStackGroup } from './ComposeStackGroup';
import { ContainerLogsModal } from './ContainerLogsModal';
import { ContainerTerminalModal } from './ContainerTerminalModal';
import { ContainerTagsModal } from './ContainerTagsModal';
import { SystemPruneModal } from './SystemPruneModal';
import { ImageUpdateModal } from './ImageUpdateModal';
import { ComposeConfigModal } from './ComposeConfigModal';
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

import { useContainersPageState } from './useContainersPageState';

export interface ContainersPageProps {
  isAdmin?: boolean;
  onNavigateToDetail?: (id: string, defaultTab?: string) => void;
  initialAction?: string | null;
}

export const ContainersPage: React.FC<ContainersPageProps> = ({ 
  isAdmin = true,
  onNavigateToDetail,
  initialAction
}) => {
  const { t } = useI18n();
  const toast = useToast();

  const {
    containers,
    statsMap,
    loading,
    refreshing,
    search,
    setSearch,
    actionInProgress,
    selectedLogsContainer,
    setSelectedLogsContainer,
    selectedTerminalContainer,
    setSelectedTerminalContainer,
    selectedInspectContainer,
    setSelectedInspectContainer,
    editingTagsContainer,
    setEditingTagsContainer,
    sheetContainer,
    setSheetContainer,
    imageUpdateContainer,
    setImageUpdateContainer,
    composeConfigProject,
    setComposeConfigProject,
    selectedTag,
    setSelectedTag,
    selectedState,
    setSelectedState,
    showPruneModal,
    setShowPruneModal,
    viewMode,
    setViewMode,
    loadContainers,
    handleAction,
    tagsWithCounts,
    filteredContainers,
    handleTagsUpdated,
  } = useContainersPageState({ initialAction });

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

  const handleInspect = (c: DockerContainer, defaultTab?: string) => {
    if (onNavigateToDetail) {
      onNavigateToDetail(c.Id, defaultTab);
    } else {
      setSelectedInspectContainer(c);
    }
  };

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
          onInspect={handleInspect}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          isAdmin={isAdmin}
          onOpenImageUpdate={(c) => setImageUpdateContainer({
            id: c.Id,
            name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
            image: c.Image
          })}
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
          onInspect={handleInspect}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          isAdmin={isAdmin}
          onOpenComposeConfig={(name) => setComposeConfigProject(name)}
          onOpenImageUpdate={(c) => setImageUpdateContainer({
            id: c.Id,
            name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
            image: c.Image
          })}
        />
      )}

      {/* Konteyner İşlemler Paneli (Midnight v2 Sheet) */}
      <ContainerActionSheet
        container={sheetContainer}
        isOpen={!!sheetContainer}
        onClose={() => setSheetContainer(null)}
        onAction={handleAction}
        onInspect={handleInspect}
        onOpenLogs={(id, name) => setSelectedLogsContainer({ id, name })}
        onOpenTerminal={(id, name) => setSelectedTerminalContainer({ id, name })}
        onEditTags={(c) => setEditingTagsContainer(c)}
        isAdmin={isAdmin}
      />

      {/* Konteyner Detay & Canlı Yapılandırma Modalı */}
      {selectedInspectContainer && (
        <ContainerDetailModal
          containerId={selectedInspectContainer.Id}
          containerSummary={selectedInspectContainer}
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

      {/* OCI İmaj Güncelleme Denetleyici Modalı */}
      {imageUpdateContainer && (
        <ImageUpdateModal
          containerId={imageUpdateContainer.id}
          containerName={imageUpdateContainer.name}
          imageName={imageUpdateContainer.image}
          isOpen={!!imageUpdateContainer}
          onClose={() => setImageUpdateContainer(null)}
          onSuccess={() => {
            loadContainers(true);
            toast.success('Konteyner güncellendi ve yeniden başlatıldı.');
          }}
        />
      )}

      {/* Compose Stack YAML Konfigürasyon Modalı */}
      {composeConfigProject && (
        <ComposeConfigModal
          projectName={composeConfigProject}
          isOpen={!!composeConfigProject}
          isAdmin={isAdmin}
          onClose={() => setComposeConfigProject(null)}
          onSuccess={() => {
            loadContainers(true);
            toast.success('Compose stack güncellendi.');
          }}
        />
      )}
    </div>
  );
};

export default ContainersPage;
