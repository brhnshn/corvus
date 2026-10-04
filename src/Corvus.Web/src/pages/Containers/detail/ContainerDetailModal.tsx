import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../../i18n';
import { X, Layers, Key, Network, HardDrive, Cpu, Loader2, AlertCircle } from 'lucide-react';
import { containersApi } from '../../../api/containers';
import { ContainerOverviewTab } from './ContainerOverviewTab';
import { ContainerEnvTab } from './ContainerEnvTab';
import { ContainerNetworkingTab } from './ContainerNetworkingTab';
import { ContainerStorageTab } from './ContainerStorageTab';
import { ContainerResourcesTab } from './ContainerResourcesTab';
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
      setActiveTab(initialTab || 'overview');
    } else {
      setInspectData(null);
      setError(null);
    }
  }, [isOpen, containerId, initialTab, loadInspectData]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none overflow-y-auto">
      <div className="w-full max-w-4xl sheet-glass border border-white/10 rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#d5d5dc] shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-[#eceef6] truncate">
                  {containerName}
                </h3>
                <span className="font-mono text-xs text-[#9ba0b5] bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-lg">
                  {containerId.substring(0, 12)}
                </span>
              </div>
              <p className="text-xs text-[#9ba0b5] truncate mt-0.5">
                {t('containers.detailModalTitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/[0.01] px-5 sm:px-6 overflow-x-auto no-scrollbar gap-1 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#d5d5dc] text-[#eceef6] bg-white/[0.05] rounded-t-xl'
                : 'border-transparent text-[#9ba0b5] hover:text-[#eceef6]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t('containers.tabOverview')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'env'
                ? 'border-[#d5d5dc] text-[#eceef6] bg-white/[0.05] rounded-t-xl'
                : 'border-transparent text-[#9ba0b5] hover:text-[#eceef6]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{t('containers.tabEnv')}</span>
            {envCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[#9ba0b5]">
                {envCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('networking')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'networking'
                ? 'border-[#d5d5dc] text-[#eceef6] bg-white/[0.05] rounded-t-xl'
                : 'border-transparent text-[#9ba0b5] hover:text-[#eceef6]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{t('containers.tabNetworking')}</span>
            {portsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[#9ba0b5]">
                {portsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'storage'
                ? 'border-[#d5d5dc] text-[#eceef6] bg-white/[0.05] rounded-t-xl'
                : 'border-transparent text-[#9ba0b5] hover:text-[#eceef6]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{t('containers.tabStorage')}</span>
            {mountsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-[#9ba0b5]">
                {mountsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'resources'
                ? 'border-[#d5d5dc] text-[#eceef6] bg-white/[0.05] rounded-t-xl'
                : 'border-transparent text-[#9ba0b5] hover:text-[#eceef6]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('containers.tabResources')}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#9ba0b5]">
              <Loader2 className="w-7 h-7 text-[#d5d5dc] animate-spin" />
              <span className="text-xs">Konteyner detayları alınıyor…</span>
            </div>
          ) : error ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-rose-400 text-center">
              <AlertCircle className="w-8 h-8" />
              <p className="text-xs">{error}</p>
              <button
                type="button"
                onClick={loadInspectData}
                className="mt-2 px-4 py-1.5 text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Tekrar Dene
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
    </div>
  );
};
