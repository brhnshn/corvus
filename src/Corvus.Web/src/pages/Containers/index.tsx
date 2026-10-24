import React from 'react';
import type { DockerContainer } from '../../api/client';
import { ContainerList } from './ContainerList';
import { ComposeStackGroup } from './ComposeStackGroup';
import { ContainersHeader } from './ContainersHeader';
import { ContainersStats } from './ContainersStats';
import { ContainersModals } from './ContainersModals';
import { ContainersToolbar } from './ContainersToolbar';
import { ContainersFilterChips } from './ContainersFilterChips';
import { ContainersEmptyStates } from './ContainersEmptyStates';
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

  const handleOpenImageUpdate = (c: DockerContainer) => {
    setImageUpdateContainer({
      id: c.Id,
      name: c.Names?.[0]?.replace(/^\//, '') || c.Id.slice(0, 12),
      image: c.Image
    });
  };

  const handleRequestDelete = (c: DockerContainer) => {
    setDeleteForce(false);
    setDeleteVolumes(false);
    setDeletingContainer(c);
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
        <ContainersToolbar
          search={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </MotionItem>

      {/* 4. Filtre Çipleri (Etiketler + Tümü) */}
      {(tagsWithCounts.length > 0 || selectedTag || selectedState) && (
        <MotionItem staggerIndex={2}>
          <ContainersFilterChips
            totalCount={containers.length}
            selectedTag={selectedTag}
            selectedState={selectedState}
            tagsWithCounts={tagsWithCounts}
            onSelectTag={setSelectedTag}
            onSelectState={setSelectedState}
          />
        </MotionItem>
      )}

      {/* Yükleniyor / Boş Durumlar */}
      <ContainersEmptyStates
        loading={loading}
        total={containers.length}
        filteredCount={filteredContainers.length}
        onRefresh={() => loadContainers(true)}
        onClearFilters={() => {
          setSearch('');
          setSelectedTag(null);
          setSelectedState(null);
        }}
      />

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
            onOpenImageUpdate={handleOpenImageUpdate}
            onDeploy={handleTriggerDeploy}
            onDelete={handleRequestDelete}
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
            onOpenImageUpdate={handleOpenImageUpdate}
            onDeploy={handleTriggerDeploy}
            onDelete={handleRequestDelete}
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
