import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../../i18n';
import { Layers, Key, Network, HardDrive, Cpu, Loader2, AlertCircle } from 'lucide-react';
import { containersApi } from '../../../api/containers';
import { ContainerOverviewTab } from './ContainerOverviewTab';
import { ContainerEnvTab } from './ContainerEnvTab';
import { ContainerNetworkingTab } from './ContainerNetworkingTab';
import { ContainerStorageTab } from './ContainerStorageTab';
import { ContainerResourcesTab } from './ContainerResourcesTab';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import type { DockerContainerInspectInfo, DockerContainer, ContainerStats } from '../../../types';

interface ContainerDetailModalProps {
  containerId: string | null;
  containerSummary?: DockerContainer;
  initialTab?: TabType;
  liveStats?: ContainerStats;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onOpenTerminal: (id: string, name: string) => void;
  onOpenLogs: (id: string, name: string) => void;
  onContainerActionSuccess?: () => void;
}

type TabType = 'overview' | 'env' | 'networking' | 'storage' | 'resources';

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
  onContainerActionSuccess
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [inspectData, setInspectData] = useState<DockerContainerInspectInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadInspectData = useCallback(async () => {
    if (!containerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await containersApi.inspectContainer(containerId);
      setInspectData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load container details');
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  useEffect(() => {
    if (isOpen && containerId) {
      loadInspectData();
      setActiveTab(initialTab);
    } else {
      setInspectData(null);
      setError(null);
    }
  }, [isOpen, containerId, initialTab, loadInspectData]);

  if (!isOpen || !containerId) return null;

  const containerName = containerSummary?.Names?.[0]?.replace(/^\//, '') || inspectData?.name?.replace(/^\//, '') || containerId.substring(0, 12);

  const handleAction = async (actionFn: () => Promise<any>) => {
    setActionLoading(true);
    try {
      await actionFn();
      await loadInspectData();
      if (onContainerActionSuccess) {
        onContainerActionSuccess();
      }
    } catch (err) {
      console.error('Container action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const envCount = inspectData?.config?.env?.length ?? 0;
  const mountsCount = inspectData?.mounts?.length ?? 0;
  const portsCount = Object.keys(inspectData?.networkSettings?.ports || inspectData?.hostConfig?.portBindings || {}).length;

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
      subtitle={t('containers.detailModalTitle') || 'Konteyner Konfigürasyonu & İnceleme'}
      icon={<Layers className="w-5 h-5 text-[var(--text-primary)]" />}
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col max-h-[75vh]">
        {/* Tab Navigation */}
        <div className="tabs border-b border-[var(--border-hairline)] pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('containers.tabOverview') || 'Genel Bakış'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`tab ${activeTab === 'env' ? 'active' : ''}`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{t('containers.tabEnv') || 'Ortam Değişkenleri'}</span>
            {envCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                {envCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('networking')}
            className={`tab ${activeTab === 'networking' ? 'active' : ''}`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{t('containers.tabNetworking') || 'Ağ & Portlar'}</span>
            {portsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                {portsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`tab ${activeTab === 'storage' ? 'active' : ''}`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t('containers.tabStorage') || 'Depolama'}</span>
            {mountsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                {mountsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('containers.tabResources') || 'Kaynak Limitleri'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
              <Loader2 className="w-7 h-7 text-[var(--text-primary)] animate-spin" />
              <span className="text-xs">{t('common.loading') || 'Yükleniyor…'}</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--status-down)] text-center">
              <AlertCircle className="w-8 h-8" />
              <p className="text-xs">{error}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={loadInspectData}
                className="mt-2"
              >
                {t('common.retry') || 'Tekrar Dene'}
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
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
