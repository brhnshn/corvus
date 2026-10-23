import React, { useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useToast } from '../../components/ui/ToastContext';
import { ContainerDetailHeader } from './ContainerDetailHeader';
import { ContainerTelemetryHero } from './ContainerTelemetryHero';
import { ContainerHistoricalCharts } from './ContainerHistoricalCharts';
import { ContainerDetailTabsNav } from './ContainerDetailTabsNav';
import { ContainerDeleteConfirmModal } from './ContainerDeleteConfirmModal';
import { useContainerDetailData } from './useContainerDetailData';
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
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResourceLimitsModal, setShowResourceLimitsModal] = useState(false);

  const {
    container,
    inspect,
    stats,
    telemetryHistory,
    loading,
    error,
    actionInProgress,
    loadContainerData,
    handleAction,
    showDeleteModal,
    setShowDeleteModal,
    deleteForce,
    setDeleteForce,
    deleteVolumes,
    setDeleteVolumes,
    deleting,
    handleConfirmDelete,
  } = useContainerDetailData(containerId, onBack);

  const isRunning = container?.State?.toLowerCase() === 'running';

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
      <ContainerDetailTabsNav activeTab={activeTab} onSelectTab={setActiveTab} isAdmin={isAdmin} />

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

      <ContainerDeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        containerName={containerName}
        isRunning={isRunning}
        deleting={deleting}
        deleteForce={deleteForce}
        onDeleteForceChange={setDeleteForce}
        deleteVolumes={deleteVolumes}
        onDeleteVolumesChange={setDeleteVolumes}
      />
    </div>
  );
};

export default ContainerDetailPage;
