import React from 'react';
import type { DockerContainer } from '../../api/client';
import { Rocket } from 'lucide-react';
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
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/ToastContext';
import { useI18n } from '../../i18n';
import type { useContainersPageState } from './useContainersPageState';

export interface ContainersModalsProps {
  effectiveIsAdmin: boolean;
  handleInspect: (c: DockerContainer, defaultTab?: string) => void;
  pageState: ReturnType<typeof useContainersPageState>;
}

export const ContainersModals: React.FC<ContainersModalsProps> = ({
  effectiveIsAdmin,
  handleInspect,
  pageState,
}) => {
  const { t } = useI18n();
  const toast = useToast();

  const {
    statsMap,
    setSelectedLogsContainer,
    selectedLogsContainer,
    setSelectedTerminalContainer,
    selectedTerminalContainer,
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
    showPruneModal,
    setShowPruneModal,
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
    handleTagsUpdated,
    activeDeployment,
    isDeployModalOpen,
    setIsDeployModalOpen,
    webhookWizardContainer,
    setWebhookWizardContainer,
    handleTriggerDeploy,
  } = pageState;

  const deletingContainerName = deletingContainer
    ? (deletingContainer.Names?.[0] || deletingContainer.Id.slice(0, 12)).replace(/^\//, '')
    : '';
  const isDeletingContainerRunning = (deletingContainer?.State || '').toLowerCase() === 'running';

  return (
    <>
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
        onDeploy={(c) => handleTriggerDeploy(c)}
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
          onTriggerDeploy={(c) => handleTriggerDeploy(c)}
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
    </>
  );
};
