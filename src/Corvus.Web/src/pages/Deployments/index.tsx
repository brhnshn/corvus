import React from 'react';
import { Rocket, RefreshCw, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useDeploymentsPageState } from './useDeploymentsPageState';
import { DeploymentsOverview } from './DeploymentsOverview';
import { DeploymentsHistoryTable } from './DeploymentsHistoryTable';
import { NewDeploymentModal } from './NewDeploymentModal';
import { DeploymentProgressModal } from '../Containers/deployments/DeploymentProgressModal';
import { DeployWebhookWizardModal } from '../Containers/deployments/DeployWebhookWizardModal';

export const DeploymentsPage: React.FC = () => {
  const { t } = useI18n();
  const {
    deployments,
    containers,
    loading,
    isRefreshing,
    stats,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isNewDeploymentModalOpen,
    setIsNewDeploymentModalOpen,
    isWebhookModalOpen,
    setIsWebhookModalOpen,
    selectedContainerForWebhook,
    activeDeployment,
    setActiveDeployment,
    handleTriggerScratchDeploy,
    handleTriggerExistingDeploy,
    handleOpenWebhookWizard,
    refresh
  } = useDeploymentsPageState();

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Üst Başlık & Aksiyon Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Rocket className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              {t('deployments.title')}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{t('deployments.subtitle')}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewDeploymentModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Rocket className="w-4 h-4" />
            <span>{t('deployments.newDeploymentBtn')}</span>
          </button>
        </div>
      </div>

      {/* 4 Özet Kartı */}
      <DeploymentsOverview stats={stats} />

      {/* Dağıtım Geçmiş Tablosu */}
      <DeploymentsHistoryTable 
        deployments={deployments}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* Sıfırdan & Mevcut Konteyner Dağıtım Sihirbazı Modalı */}
      <NewDeploymentModal 
        isOpen={isNewDeploymentModalOpen}
        onClose={() => setIsNewDeploymentModalOpen(false)}
        containers={containers}
        onTriggerScratchDeploy={handleTriggerScratchDeploy}
        onTriggerExistingDeploy={handleTriggerExistingDeploy}
        onOpenWebhookWizard={handleOpenWebhookWizard}
      />

      {/* Canlı Dağıtım Log ve İlerleme Modalı */}
      {activeDeployment && (
        <DeploymentProgressModal
          deploymentId={activeDeployment.deploymentId}
          containerId={activeDeployment.containerId}
          containerName={activeDeployment.containerName}
          imageName={activeDeployment.imageName}
          isOpen={true}
          onClose={() => {
            setActiveDeployment(null);
            refresh();
          }}
        />
      )}

      {/* GitHub Actions Webhook Kurulum Modalı */}
      {selectedContainerForWebhook && (
        <DeployWebhookWizardModal
          isOpen={isWebhookModalOpen}
          onClose={() => setIsWebhookModalOpen(false)}
          containerId={selectedContainerForWebhook.Id}
          containerName={selectedContainerForWebhook.Names?.[0]?.replace(/^\//, '') || selectedContainerForWebhook.Id.slice(0, 12)}
        />
      )}
    </div>
  );
};
