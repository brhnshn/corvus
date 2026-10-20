import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Layers, 
  Cpu, 
  Key, 
  Network, 
  HardDrive, 
  FileText, 
  Terminal as TerminalIcon, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api, containersApi, type DockerContainer, type DockerContainerInspectInfo, type ContainerStats } from '../../api/client';
import { useI18n } from '../../i18n';
import { useToast } from '../../components/ui/ToastContext';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import { ContainerDetailHeader } from './ContainerDetailHeader';
import { ContainerTelemetryHero } from './ContainerTelemetryHero';
import { ContainerHistoricalCharts, type ContainerTelemetryPoint } from './ContainerHistoricalCharts';
import type { ContainerDetailTab, ContainerDetailPageProps } from './types';
import { getInspectEnv, getInspectHostConfig, getInspectConfig } from '../Containers/detail/inspectHelpers';

// Modüler Alt Sekmeler (Clean Architecture)
import { ContainerOverviewTab } from '../Containers/detail/ContainerOverviewTab';
import { ContainerResourcesTab } from '../Containers/detail/ContainerResourcesTab';
import { ContainerEnvTab } from '../Containers/detail/ContainerEnvTab';
import { ContainerNetworkingTab } from '../Containers/detail/ContainerNetworkingTab';
import { ContainerStorageTab } from '../Containers/detail/ContainerStorageTab';
import { ContainerResourceLimitsModal } from '../Containers/detail/ContainerResourceLimitsModal';
import { LogsTab } from './tabs/LogsTab';
import { TerminalTab } from './tabs/TerminalTab';
import { ImageUpdateModal } from '../Containers/ImageUpdateModal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export const ContainerDetailPage: React.FC<ContainerDetailPageProps> = ({
  containerId,
  onBack,
  isAdmin = true
}) => {
  const { t } = useI18n();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ContainerDetailTab>(() => {
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    const validTabs: ContainerDetailTab[] = ['overview', 'resources', 'env', 'networking', 'storage', 'logs', 'terminal'];
    return (validTabs.includes(queryTab as ContainerDetailTab) ? queryTab : 'overview') as ContainerDetailTab;
  });
  const [container, setContainer] = useState<DockerContainer | null>(null);
  const [inspect, setInspect] = useState<DockerContainerInspectInfo | null>(null);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<ContainerTelemetryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResourceLimitsModal, setShowResourceLimitsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteForce, setDeleteForce] = useState(true);
  const [deleteVolumes, setDeleteVolumes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isMountedRef = useRef(true);

  // 1. Ana Konteyner ve Inspect Verilerini Yükle
  const loadContainerData = useCallback(async () => {
    try {
      const [allContainers, inspectData] = await Promise.all([
        api.getContainers(),
        containersApi.inspectContainer(containerId)
      ]);

      if (!isMountedRef.current) return;

      if (Array.isArray(allContainers)) {
        const found = allContainers.find(
          (c) => c.Id === containerId || c.Id.startsWith(containerId)
        );
        if (found) setContainer(found);
      }

      setInspect(inspectData);
      setError(null);
    } catch (err: unknown) {
      if (isMountedRef.current) {
        console.error('Konteyner detayları alınamadı:', err);
        setError(err instanceof Error ? err.message : t('containers.notFoundTitle'));
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [containerId, t]);

  // 2. Canlı Telemetriyi (CPU/RAM/Net) Arka Planda Güncelle ve Tarihsel Seriye Ekle
  const fetchLiveStats = useCallback(async () => {
    try {
      const liveData = await containersApi.getContainerStats(containerId);
      if (liveData && isMountedRef.current) {
        setStats(liveData);
        const now = new Date();
        const newPoint: ContainerTelemetryPoint = {
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          fullTime: now.toLocaleTimeString(),
          cpuPercent: +liveData.cpuPercent.toFixed(1),
          memoryUsageBytes: liveData.memoryUsageBytes,
          memoryPercent: +liveData.memoryPercent.toFixed(1),
          networkRxBytes: liveData.networkRxBytes,
          networkTxBytes: liveData.networkTxBytes
        };
        setTelemetryHistory((prev) => {
          const next = [...prev, newPoint];
          return next.slice(-30);
        });
      }
    } catch {
      // sessizce geç
    }
  }, [containerId]);

  const initLoad = useCallback(() => {
    setLoading(true);
    loadContainerData();
    fetchLiveStats();
  }, [loadContainerData, fetchLiveStats]);

  useLoadEffect(initLoad);

  useEffect(() => {
    isMountedRef.current = true;

    // 5 saniyede bir canlı telemetriyi güncelle
    const statsInterval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) {
        fetchLiveStats();
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      clearInterval(statsInterval);
    };
  }, [fetchLiveStats]);

  // 3. Yaşam Döngüsü Eylemleri (Start, Stop, Restart, Pause, Unpause)
  const handleAction = async (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart') => {
    const cleanName = container?.Names?.[0]?.replace(/^\//, '') || containerId.slice(0, 12);
    const actionLabels: Record<string, string> = {
      start: t('containers.actionInProgressStart'),
      stop: t('containers.actionInProgressStop'),
      pause: t('containers.actionInProgressPause'),
      unpause: t('containers.actionInProgressUnpause'),
      restart: t('containers.actionInProgressRestart')
    };

    setActionInProgress(action);
    toast.info(`"${cleanName}" ${actionLabels[action]}…`);

    try {
      if (action === 'start') await api.startContainer(containerId);
      else if (action === 'stop') await api.stopContainer(containerId);
      else if (action === 'pause') await api.pauseContainer(containerId);
      else if (action === 'unpause') await api.unpauseContainer(containerId);
      else if (action === 'restart') await api.restartContainer(containerId);

      toast.success(t('containers.actionCompletedToast', { name: cleanName }));
      await loadContainerData();
      await fetchLiveStats();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('containers.actionFailedToast'));
    } finally {
      if (isMountedRef.current) setActionInProgress(null);
    }
  };

  const handleConfirmDelete = async () => {
    const cleanName = container?.Names?.[0]?.replace(/^\//, '') || containerId.slice(0, 12);
    setDeleting(true);
    try {
      await api.deleteContainer(containerId, deleteForce, deleteVolumes);
      toast.success(t('containers.deleteSuccess', { name: cleanName }));
      setShowDeleteModal(false);
      onBack();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('containers.deleteError'));
    } finally {
      if (isMountedRef.current) setDeleting(false);
    }
  };

  const isRunning = container?.State?.toLowerCase() === 'running';

  const tabs = [
    { id: 'overview' as const, label: t('containers.tabOverview'), icon: Layers },
    { id: 'resources' as const, label: t('containers.tabResources'), icon: Cpu },
    { id: 'env' as const, label: t('containers.tabEnv'), icon: Key },
    { id: 'networking' as const, label: t('containers.tabNetworking'), icon: Network },
    { id: 'storage' as const, label: t('containers.tabStorage'), icon: HardDrive },
    { id: 'logs' as const, label: t('containers.tabLogs'), icon: FileText },
    ...(isAdmin ? [{ id: 'terminal' as const, label: t('containers.tabTerminal'), icon: TerminalIcon }] : [])
  ];

  if (loading && !inspect) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-[#9ba0b5] gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-indigo-400" />
        <span className="text-xs font-mono tracking-wider">{t('containers.fetchingDetails')}</span>
      </div>
    );
  }

  if (error && !inspect) {
    return (
      <div className="surface rounded-[24px] p-8 border border-red-500/20 max-w-lg mx-auto text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">{t('containers.notFoundTitle')}</h2>
        <p className="text-xs text-white/60 leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-white text-black hover:bg-white/90 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md"
        >
          {t('containers.backToList')}
        </button>
      </div>
    );
  }

  const containerName = container?.Names?.[0]?.replace(/^\//, '') || containerId.slice(0, 12);

  return (
    <div className="space-y-5 animate-rv">
      {/* 1. Üst Başlık & Yaşam Döngüsü Kontrolleri */}
      <ContainerDetailHeader
        container={container}
        containerId={containerId}
        onBack={onBack}
        actionInProgress={actionInProgress}
        onAction={handleAction}
        onDelete={() => setShowDeleteModal(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isAdmin={isAdmin}
        onOpenUpdateModal={() => setShowUpdateModal(true)}
        onOpenResourceLimitsModal={() => setShowResourceLimitsModal(true)}
      />

      {/* 2. Canlı Telemetri Hero Alanı (CPU / RAM / Ağ) */}
      <ContainerTelemetryHero stats={stats} isRunning={isRunning} />

      {/* 2.1 Tarihsel Telemetri Zaman Serisi Grafikleri */}
      <ContainerHistoricalCharts
        data={telemetryHistory}
        isRunning={isRunning}
        memoryLimitBytes={getInspectHostConfig(inspect).memory || stats?.memoryLimitBytes || 0}
      />

      {/* 3. Çok Sekmeli Gezinme Çubuğu */}
      <div className="glass rounded-[20px] p-[4px] flex gap-1 overflow-x-auto no-scrollbar shadow-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-[16px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-white text-black shadow-xs font-bold'
                  : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#9ba0b5]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Aktif Sekme İçeriği */}
      <div className="animate-in fade-in-0 duration-200">
        {activeTab === 'overview' && inspect && (
          <ContainerOverviewTab
            inspect={inspect}
            containerSummary={container || undefined}
            isAdmin={isAdmin}
            actionLoading={!!actionInProgress}
            showActionsToolbar={false}
            onStart={() => handleAction('start')}
            onStop={() => handleAction('stop')}
            onRestart={() => handleAction('restart')}
            onPause={() => handleAction('pause')}
            onUnpause={() => handleAction('unpause')}
            onOpenTerminal={() => setActiveTab('terminal')}
            onOpenLogs={() => setActiveTab('logs')}
            onOpenResourceLimitsModal={() => setShowResourceLimitsModal(true)}
          />
        )}

        {activeTab === 'resources' && inspect && (
          <ContainerResourcesTab
            inspect={inspect}
            initialStats={stats || undefined}
            isAdmin={isAdmin}
            onUpdated={loadContainerData}
            onOpenResourceLimitsModal={() => setShowResourceLimitsModal(true)}
          />
        )}

        {activeTab === 'env' && inspect && (
          <ContainerEnvTab envList={getInspectEnv(inspect)} />
        )}

        {activeTab === 'networking' && inspect && (
          <ContainerNetworkingTab inspect={inspect} />
        )}

        {activeTab === 'storage' && inspect && (
          <ContainerStorageTab inspect={inspect} />
        )}

        {activeTab === 'logs' && (
          <LogsTab containerId={containerId} containerName={containerName} />
        )}

        {activeTab === 'terminal' && (
          <TerminalTab containerId={containerId} containerName={containerName} />
        )}
      </div>

      {showUpdateModal && (
        <ImageUpdateModal
          containerId={containerId}
          containerName={containerName}
          imageName={getInspectConfig(inspect).image || container?.Image || ''}
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
          onSuccess={() => {
            loadContainerData();
            toast.success(t('containers.recreateSuccess'));
          }}
        />
      )}

      {showResourceLimitsModal && (
        <ContainerResourceLimitsModal
          isOpen={showResourceLimitsModal}
          containerId={containerId}
          containerName={containerName}
          inspect={inspect}
          onClose={() => setShowResourceLimitsModal(false)}
          onSuccess={loadContainerData}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={t('containers.deleteTitle')}
        description={t('containers.deleteConfirm', { name: containerName })}
        confirmLabel={deleting ? t('containers.deleting') : t('containers.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
      >
        <div className="space-y-2 pt-1 text-xs">
          {isRunning && (
            <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--status-warn-bg)] border border-[var(--status-warn)]/30 text-[var(--status-warn)]">
              {t('containers.deleteRunningWarning')}
            </div>
          )}
          <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deleteForce}
              onChange={(e) => setDeleteForce(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
            />
            <span>{t('containers.deleteForceLabel')}</span>
          </label>
          <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={deleteVolumes}
              onChange={(e) => setDeleteVolumes(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
            />
            <span>{t('containers.deleteVolumesLabel')}</span>
          </label>
        </div>
      </ConfirmModal>
    </div>
  );
};

export default ContainerDetailPage;
