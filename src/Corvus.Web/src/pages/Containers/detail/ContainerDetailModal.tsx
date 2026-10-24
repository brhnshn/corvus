import React, { useState } from 'react';
import { useI18n } from '../../../i18n';
import { Layers } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { ContainerResourceLimitsModal } from './ContainerResourceLimitsModal';
import { useContainerInspect, type DetailTabType } from './useContainerInspect';
import { ContainerDetailTabNav } from './ContainerDetailTabNav';
import { ContainerDetailTabContent } from './ContainerDetailTabContent';
import type { DockerContainer, ContainerStats } from '../../../types';

export type { DetailTabType as TabType };

export interface ContainerDetailModalProps {
  containerId: string | null;
  containerSummary?: DockerContainer;
  initialTab?: DetailTabType;
  liveStats?: ContainerStats;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onOpenTerminal: (id: string, name: string) => void;
  onOpenLogs: (id: string, name: string) => void;
  onTriggerDeploy?: (container: DockerContainer) => void;
  onContainerActionSuccess?: () => void;
}

export const ContainerDetailModal: React.FC<ContainerDetailModalProps> = ({
  containerId,
  containerSummary,
  initialTab = 'overview',
  liveStats,
  isOpen,
  isAdmin,
  onClose,
  onOpenTerminal,
  onOpenLogs,
  onTriggerDeploy,
  onContainerActionSuccess,
}) => {
  const { t } = useI18n();
  const [showResourceLimitsModal, setShowResourceLimitsModal] = useState(false);

  const {
    activeTab,
    setActiveTab,
    inspectData,
    loading,
    error,
    actionLoading,
    loadInspectData,
    handleAction,
  } = useContainerInspect({
    containerId,
    isOpen,
    initialTab,
    onContainerActionSuccess,
  });

  if (!isOpen || !containerId) return null;

  const containerName =
    containerSummary?.Names?.[0]?.replace(/^\//, '') ||
    inspectData?.name?.replace(/^\//, '') ||
    containerId.substring(0, 12);

  const envCount = inspectData?.config?.env?.length ?? 0;
  const mountsCount = inspectData?.mounts?.length ?? 0;
  const portsCount = Object.keys(
    inspectData?.networkSettings?.ports || inspectData?.hostConfig?.portBindings || {}
  ).length;

  const modalTitle = (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold text-sm text-[var(--text-primary)] truncate">{containerName}</span>
      <span className="mono text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] px-2 py-0.5 rounded-[var(--radius-sm)]">
        {containerId.substring(0, 12)}
      </span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={t('containers.detailModalTitle')}
      icon={<Layers className="w-5 h-5 text-[var(--text-primary)]" />}
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col max-h-[75vh]">
        <ContainerDetailTabNav
          activeTab={activeTab}
          onChange={setActiveTab}
          envCount={envCount}
          portsCount={portsCount}
          mountsCount={mountsCount}
        />

        <ContainerDetailTabContent
          activeTab={activeTab}
          inspectData={inspectData}
          containerSummary={containerSummary}
          containerId={containerId}
          containerName={containerName}
          loading={loading}
          error={error}
          actionLoading={actionLoading}
          isAdmin={isAdmin}
          liveStats={liveStats}
          onRetry={loadInspectData}
          handleAction={handleAction}
          onClose={onClose}
          onOpenTerminal={onOpenTerminal}
          onOpenLogs={onOpenLogs}
          onOpenResourceLimitsModal={() => setShowResourceLimitsModal(true)}
          onTriggerDeploy={onTriggerDeploy}
          onContainerActionSuccess={onContainerActionSuccess}
          loadInspectData={loadInspectData}
        />
      </div>

      {showResourceLimitsModal && inspectData && containerId && (
        <ContainerResourceLimitsModal
          isOpen={showResourceLimitsModal}
          containerId={containerId}
          containerName={containerName}
          inspect={inspectData}
          onClose={() => setShowResourceLimitsModal(false)}
          onSuccess={() => {
            loadInspectData();
            if (onContainerActionSuccess) {
              onContainerActionSuccess();
            }
          }}
        />
      )}
    </Modal>
  );
};
