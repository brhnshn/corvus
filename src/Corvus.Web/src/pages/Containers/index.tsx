import React from 'react';
import type { DockerContainer } from '../../api/client';
import { RefreshCw, Boxes, Layers, List, Rocket } from 'lucide-react';
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
import { DeploymentProgressModal } from './deployments/DeploymentProgressModal';
import { DeployWebhookWizardModal } from './deployments/DeployWebhookWizardModal';
import { ContainersHeader } from './ContainersHeader';
import { ContainersStats } from './ContainersStats';
import { SearchInput } from '../../components/ui/SearchInput';
import { Segment } from '../../components/ui/Segment';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useI18n } from '../../i18n';
import { tagHue } from '../../utils/tagHue';
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { useEntityGrouping, deriveSmartGroup } from '../../utils/grouping';

import { useContainersPageState } from './useContainersPageState';

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
  const toast = useToast();
  const isViewer = role === 'viewer';
  const effectiveIsAdmin = isAdmin && !isViewer;

  const [activeSystemName, setActiveSystemName] = React.useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_name') : null) || 'Host';
  });

  React.useEffect(() => {
    const handleSystemChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.systemName) {
        setActiveSystemName(customEvent.detail.systemName);
      } else {
        const savedName = localStorage.getItem('corvus_active_system_name') || 'Host';
        setActiveSystemName(savedName);
      }
    };
    window.addEventListener('corvus_active_system_changed', handleSystemChange);
    return () => window.removeEventListener('corvus_active_system_changed', handleSystemChange);
  }, []);

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
    deletingContainer,
    setDeletingContainer,
    deleteForce,
    setDeleteForce,
    deleteVolumes,
    setDeleteVolumes,
    isDeleting,
    handleConfirmDelete,
    loadContainers,
    handleAction,
    tagsWithCounts,
    filteredContainers,
    handleTagsUpdated,
    activeDeployment,
    isDeployModalOpen,
    setIsDeployModalOpen,
    webhookWizardContainer,
    setWebhookWizardContainer,
    handleTriggerDeploy
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

  const deletingContainerName = deletingContainer
    ? (deletingContainer.Names?.[0] || deletingContainer.Id.slice(0, 12)).replace(/^\//, '')
    : '';
  const isDeletingContainerRunning = (deletingContainer?.State || '').toLowerCase() === 'running';

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
        onDeploy={handleTriggerDeploy}
        onOpenWebhookWizard={(c) => setWebhookWizardContainer(c)}
        onDelete={(c) => {
          setDeleteForce(false);
          setDeleteVolumes(false);
          setDeletingContainer(c);
        }}
        isAdmin={effectiveIsAdmin}
      />

      {/* Konteyner Silme Onay Modalı */}
      <ConfirmModal
        isOpen={!!deletingContainer}
        onClose={() => {
          if (!isDeleting) {
            setDeletingContainer(null);
            setDeleteForce(false);
            setDeleteVolumes(false);
          }
        }}
        onConfirm={handleConfirmDelete}
        title={t('containers.deleteTitle')}
        description={
          <div className="space-y-2">
            <p>{t('containers.deleteConfirm', { name: deletingContainerName })}</p>
            {isDeletingContainerRunning && (
              <p className="text-amber-400 font-medium">{t('containers.deleteRunningWarning')}</p>
            )}
          </div>
        }
        confirmLabel={isDeleting ? t('containers.deleting') : t('containers.deleteShort')}
        cancelLabel={t('common.cancel')}
        loading={isDeleting}
        variant="danger"
      >
        <div className="space-y-2.5">
          {!isDeletingContainerRunning && (
            <label className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deleteForce}
                onChange={(e) => setDeleteForce(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/30"
              />
              <span>{t('containers.deleteForceLabel')}</span>
            </label>
          )}
          <label className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deleteVolumes}
              onChange={(e) => setDeleteVolumes(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/30"
            />
            <span>{t('containers.deleteVolumesLabel')}</span>
          </label>
        </div>
      </ConfirmModal>

      {/* Konteyner Detay & Canlı Yapılandırma Modalı */}
      {selectedInspectContainer && (
        <ContainerDetailModal
          containerId={selectedInspectContainer.Id}
          containerSummary={selectedInspectContainer}
          liveStats={statsMap[selectedInspectContainer.Id]}
          isOpen={!!selectedInspectContainer}
          isAdmin={effectiveIsAdmin}
          onClose={() => setSelectedInspectContainer(null)}
          onOpenTerminal={(id, name) => setSelectedTerminalContainer({ id, name })}
          onOpenLogs={(id, name) => setSelectedLogsContainer({ id, name })}
          onTriggerDeploy={handleTriggerDeploy}
          onContainerActionSuccess={() => loadContainers()}
        />
      )}

      {/* Canlı Dağıtım (Deployment) Modalı */}
      {activeDeployment && (
        <DeploymentProgressModal
          isOpen={isDeployModalOpen}
          deploymentId={activeDeployment.deploymentId}
          containerId={activeDeployment.containerId}
          containerName={activeDeployment.containerName}
          imageName={activeDeployment.imageName}
          onClose={() => {
            setIsDeployModalOpen(false);
            loadContainers(true);
          }}
          onMinimize={() => setIsDeployModalOpen(false)}
          onSuccess={() => {
            loadContainers(true);
            toast.success(t('deployments.deploySuccessToast', { name: activeDeployment.containerName }));
          }}
        />
      )}

      {/* Arka Planda Yürüyen Dağıtım İçin Yüzen Mini Durum Rozeti */}
      {activeDeployment && !isDeployModalOpen && (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <button
            type="button"
            onClick={() => setIsDeployModalOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 border border-indigo-400/40 text-xs font-medium cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <Rocket className="w-3.5 h-3.5" />
            <span>
              {t('deployments.runningInBackground', { step: activeDeployment.containerName })}
            </span>
            <span className="font-semibold underline ml-1">
              {t('deployments.viewDeployment')}
            </span>
          </button>
        </div>
      )}

      {/* GitHub Actions CI/CD Webhook Sihirbazı Modalı */}
      {webhookWizardContainer && (
        <DeployWebhookWizardModal
          isOpen={!!webhookWizardContainer}
          containerId={webhookWizardContainer.Id}
          containerName={webhookWizardContainer.Names?.[0]?.replace(/^\//, '') || webhookWizardContainer.Id.slice(0, 12)}
          onClose={() => setWebhookWizardContainer(null)}
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
            toast.success(t('containers.imageUpdatedAndRestartedToast'));
          }}
        />
      )}

      {/* Compose Stack YAML Konfigürasyon Modalı */}
      {composeConfigProject && (
        <ComposeConfigModal
          projectName={composeConfigProject}
          isOpen={!!composeConfigProject}
          isAdmin={effectiveIsAdmin}
          onClose={() => setComposeConfigProject(null)}
          onSuccess={() => {
            loadContainers(true);
            toast.success(t('containers.composeStackUpdatedToast'));
          }}
        />
      )}
    </PageStage>
  );
};

export default ContainersPage;
