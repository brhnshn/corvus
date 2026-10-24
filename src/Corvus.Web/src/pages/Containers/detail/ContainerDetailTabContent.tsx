import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { Button } from '../../../components/ui/Button';
import { containersApi } from '../../../api/containers';
import { ContainerOverviewTab } from './ContainerOverviewTab';
import { ContainerEnvTab } from './ContainerEnvTab';
import { ContainerNetworkingTab } from './ContainerNetworkingTab';
import { ContainerStorageTab } from './ContainerStorageTab';
import { ContainerResourcesTab } from './ContainerResourcesTab';
import { ContainerDeploymentsTab } from './ContainerDeploymentsTab';
import type { DetailTabType } from './useContainerInspect';
import type { DockerContainerInspectInfo, DockerContainer, ContainerStats } from '../../../types';

export interface ContainerDetailTabContentProps {
  activeTab: DetailTabType;
  inspectData: DockerContainerInspectInfo | null;
  containerSummary?: DockerContainer;
  containerId: string;
  containerName: string;
  loading: boolean;
  error: string | null;
  actionLoading: boolean;
  isAdmin: boolean;
  liveStats?: ContainerStats;
  onRetry: () => void;
  handleAction: (actionFn: () => Promise<any>) => Promise<void>;
  onClose: () => void;
  onOpenTerminal: (id: string, name: string) => void;
  onOpenLogs: (id: string, name: string) => void;
  onOpenResourceLimitsModal: () => void;
  onTriggerDeploy?: (container: DockerContainer) => void;
  onContainerActionSuccess?: () => void;
  loadInspectData: () => Promise<void>;
}

export const ContainerDetailTabContent: React.FC<ContainerDetailTabContentProps> = ({
  activeTab,
  inspectData,
  containerSummary,
  containerId,
  containerName,
  loading,
  error,
  actionLoading,
  isAdmin,
  liveStats,
  onRetry,
  handleAction,
  onClose,
  onOpenTerminal,
  onOpenLogs,
  onOpenResourceLimitsModal,
  onTriggerDeploy,
  onContainerActionSuccess,
  loadInspectData,
}) => {
  const { t } = useI18n();

  return (
    <div className="py-4 overflow-y-auto flex-1">
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
          <Loader2 className="w-7 h-7 text-[var(--text-primary)] animate-spin" />
          <span className="text-xs">{t('common.loading')}</span>
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--status-down)] text-center">
          <AlertCircle className="w-8 h-8" />
          <p className="text-xs">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : inspectData ? (
        <>
          {activeTab === 'overview' && (
            <ContainerOverviewTab
              inspect={inspectData}
              containerSummary={containerSummary}
              isAdmin={isAdmin}
              actionLoading={actionLoading}
              onStart={() => handleAction(() => containersApi.startContainer(containerId))}
              onStop={() => handleAction(() => containersApi.stopContainer(containerId))}
              onRestart={() => handleAction(() => containersApi.restartContainer(containerId))}
              onPause={() => handleAction(() => containersApi.pauseContainer(containerId))}
              onUnpause={() => handleAction(() => containersApi.unpauseContainer(containerId))}
              onOpenTerminal={() => {
                onClose();
                onOpenTerminal(containerId, containerName);
              }}
              onOpenLogs={() => {
                onClose();
                onOpenLogs(containerId, containerName);
              }}
              onOpenResourceLimitsModal={onOpenResourceLimitsModal}
            />
          )}

          {activeTab === 'env' && (
            <ContainerEnvTab envList={inspectData.config?.env} />
          )}

          {activeTab === 'networking' && (
            <ContainerNetworkingTab inspect={inspectData} />
          )}

          {activeTab === 'storage' && (
            <ContainerStorageTab inspect={inspectData} />
          )}

          {activeTab === 'resources' && (
            <ContainerResourcesTab
              inspect={inspectData}
              isAdmin={isAdmin}
              initialStats={liveStats}
              onUpdated={() => {
                loadInspectData();
                if (onContainerActionSuccess) {
                  onContainerActionSuccess();
                }
              }}
              onOpenResourceLimitsModal={onOpenResourceLimitsModal}
            />
          )}

          {activeTab === 'deployments' && (
            <ContainerDeploymentsTab
              containerId={containerId}
              containerName={containerName}
              isAdmin={isAdmin}
              onTriggerDeploy={() => {
                if (containerSummary && onTriggerDeploy) {
                  onTriggerDeploy(containerSummary);
                }
              }}
            />
          )}
        </>
      ) : null}
    </div>
  );
};
