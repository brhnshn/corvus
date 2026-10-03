import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../../i18n';
import { X, Layers, Key, Network, HardDrive, Cpu, Loader2, AlertCircle } from 'lucide-react';
import { containersApi } from '../../../api/containers';
import { ContainerOverviewTab } from './ContainerOverviewTab';
import { ContainerEnvTab } from './ContainerEnvTab';
import { ContainerNetworkingTab } from './ContainerNetworkingTab';
import { ContainerStorageTab } from './ContainerStorageTab';
import { ContainerResourcesTab } from './ContainerResourcesTab';
import type { DockerContainerInspectInfo, DockerContainer } from '../../../types';

interface ContainerDetailModalProps {
  containerId: string | null;
  containerSummary?: DockerContainer;
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
  isOpen,
  isAdmin,
  onClose,
  onOpenTerminal,
  onOpenLogs,
  onContainerActionSuccess
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
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
      setActiveTab('overview');
    } else {
      setInspectData(null);
      setError(null);
    }
  }, [isOpen, containerId, loadInspectData]);

  if (!isOpen || !containerId) return null;

  const fallbackName = containerSummary?.Names?.[0]?.replace(/^\//, '') || containerId.substring(0, 12);
  const containerName = inspectData?.name?.replace(/^\//, '') || fallbackName;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate">
                  {containerName}
                </h3>
                <span className="font-mono text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                  {containerId.substring(0, 12)}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {t('containers.detailModalTitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 sm:px-5 overflow-x-auto no-scrollbar gap-1 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('containers.tabOverview')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'env'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{t('containers.tabEnv')}</span>
            {envCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                {envCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('networking')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'networking'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{t('containers.tabNetworking')}</span>
            {portsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                {portsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'storage'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t('containers.tabStorage')}</span>
            {mountsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                {mountsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'resources'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('containers.tabResources')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
              <span className="text-xs">Loading container inspect data...</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-rose-400 text-center">
              <AlertCircle className="w-8 h-8" />
              <p className="text-xs">{error}</p>
              <button
                type="button"
                onClick={loadInspectData}
                className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Retry
              </button>
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
    </div>
  );
};
