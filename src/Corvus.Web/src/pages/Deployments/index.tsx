import React from 'react';
import { Rocket, RefreshCw, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
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
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Üst Başlık & Aksiyon Çubuğu */}
      <PageHeader
        title={t('deployments.title')}
        subtitle={
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--status-up)] shrink-0" />
            <span>{t('deployments.subtitle')}</span>
          </span>
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--cloud-400)]' : ''}`} />}
              aria-label="Yenile"
            />
            <Button
              variant="cloud"
              size="sm"
              onClick={() => setIsNewDeploymentModalOpen(true)}
              icon={<Rocket className="w-3.5 h-3.5" />}
            >
              {t('deployments.newDeploymentBtn')}
            </Button>
          </>
        }
      />

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
