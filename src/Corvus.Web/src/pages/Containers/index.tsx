import React from 'react';
import type { DockerContainer } from '../../api/client';
import { RefreshCw, Boxes, Layers, List } from 'lucide-react';
import { ContainerList } from './ContainerList';
import { ComposeStackGroup } from './ComposeStackGroup';
import { ContainersHeader } from './ContainersHeader';
import { ContainersStats } from './ContainersStats';
import { ContainersModals } from './ContainersModals';
import { SearchInput } from '../../components/ui/SearchInput';
import { Segment } from '../../components/ui/Segment';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';
import { tagHue } from '../../utils/tagHue';
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { useEntityGrouping, deriveSmartGroup } from '../../utils/grouping';

import { useContainersPageState } from './useContainersPageState';
import { useActiveSystem } from '../../hooks';

export interface ContainersPageProps {
  isAdmin?: boolean;
  role?: string | null;
  onNavigateToDetail?: (id: string, defaultTab?: string) => void;
  initialAction?: string | null;
}

export const ContainersPage: React.FC<ContainersPageProps> = ({ 
  isAdmin = true,
  role,
  onNavigateToDetail,
  initialAction
}) => {
  const { t } = useI18n();
  const isViewer = role === 'viewer';
  const effectiveIsAdmin = isAdmin && !isViewer;

  const { systemName: activeSystemName } = useActiveSystem();

  const pageState = useContainersPageState({ initialAction });
  const {
    containers,
    statsMap,
    loading,
    refreshing,
    search,
    setSearch,
    actionInProgress,
    setSelectedInspectContainer,
    setImageUpdateContainer,
    setSheetContainer,
    setComposeConfigProject,
    selectedTag,
    setSelectedTag,
    selectedState,
    setSelectedState,
    setShowPruneModal,
    viewMode,
    setViewMode,
    setDeletingContainer,
    setDeleteForce,
    setDeleteVolumes,
    loadContainers,
    handleAction,
    tagsWithCounts,
    filteredContainers,
    handleTriggerDeploy
  } = pageState;

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
    getId: (c) => c?.Id || Math.random().toString(),
    getName: (c) => (c?.Names?.[0] || c?.Id || 'unknown').replace(/^\//, ''),
    getCategory: (c) => {
      const composeProject = c?.Labels?.['com.docker.compose.project'];
      const rawName = c?.Names?.[0] || c?.Id || 'unknown';
      const cleanName = (rawName || '').replace(/^\//, '');
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
    <PageStage className="space-y-4">
      {/* 1. Başlık & Hızlı İşlemler */}
      <MotionItem staggerIndex={0}>
        <ContainersHeader
          isAdmin={effectiveIsAdmin}
          systemName={activeSystemName}
          onPruneClick={() => setShowPruneModal(true)}
          onRefreshClick={() => loadContainers(true)}
          refreshing={refreshing}
        />
      </MotionItem>

      {/* 2. KPI İstatistik Şeridi */}
      <MotionItem staggerIndex={1}>
        <ContainersStats
          containers={containers}
          selectedState={selectedState}
          onFilterState={(st) => setSelectedState((prev) => (prev === st ? null : st))}
        />
      </MotionItem>

      {/* 3. Arama Çubuğu & Görünüm Segmenti */}
      <MotionItem staggerIndex={2}>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('containers.searchPlaceholder')}
            />
          </div>

          <Segment
            value={viewMode}
            onChange={(v) => setViewMode(v as 'flat' | 'compose')}
            options={[
              {
                value: 'flat',
                label: t('containers.viewFlat'),
                icon: <List className="w-3.5 h-3.5" />,
              },
              {
                value: 'compose',
                label: t('containers.viewGroups'),
                icon: <Layers className="w-3.5 h-3.5" />,
              },
            ]}
          />
        </div>
      </MotionItem>

      {/* 4. Filtre Çipleri (Etiketler + Tümü) */}
      {(tagsWithCounts.length > 0 || selectedTag || selectedState) && (
        <MotionItem staggerIndex={2}>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <FilterChip
            label={t('common.all')}
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
      </MotionItem>
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
              {t('containers.refreshList')}
            </Button>
          }
        />
      )}

      {/* Filtre Sonucu Boş Durumu */}
      {!loading && containers.length > 0 && filteredContainers.length === 0 && (
        <EmptyState
          title={t('containers.noMatchingTitle')}
          description={t('containers.noMatchingDesc')}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                setSelectedTag(null);
                setSelectedState(null);
              }}
            >
              {t('containers.clearFilters')}
            </Button>
          }
        />
      )}

      {/* 5. Konteyner Listesi: Düz Liste vs Gruplanmış Görünüm */}
      <MotionItem staggerIndex={3}>
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
            isAdmin={effectiveIsAdmin}
            onOpenImageUpdate={(c) => setImageUpdateContainer({
              id: c.Id,
              name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
              image: c.Image
            })}
            onDeploy={handleTriggerDeploy}
            onDelete={(c) => {
              setDeleteForce(false);
              setDeleteVolumes(false);
              setDeletingContainer(c);
            }}
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
            isAdmin={effectiveIsAdmin}
            onOpenComposeConfig={(name) => setComposeConfigProject(name)}
            onOpenImageUpdate={(c) => setImageUpdateContainer({
              id: c.Id,
              name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
              image: c.Image
            })}
            onDeploy={handleTriggerDeploy}
            onDelete={(c) => {
              setDeleteForce(false);
              setDeleteVolumes(false);
              setDeletingContainer(c);
            }}
          />
        )}
      </MotionItem>

      {/* Modallar ve İşlem Pencereleri (Ayrı Modüler Bileşen) */}
      <ContainersModals
        effectiveIsAdmin={effectiveIsAdmin}
        handleInspect={handleInspect}
        pageState={pageState}
      />
    </PageStage>
  );
};

export default ContainersPage;
