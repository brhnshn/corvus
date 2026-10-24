import { useState, useCallback } from 'react';
import type { DockerContainer } from '../../../api/client';
import { deploymentsApi } from '../../../api/deployments';
import { getSavedActiveDeployment } from '../deployments/useDeploymentStream';
import { useToast } from '../../../components/ui/ToastContext';
import { useI18n } from '../../../i18n';

export function useContainerDeployment() {
  const toast = useToast();
  const { t } = useI18n();

  // Deployment Center states (including F5 restoration)
  const [activeDeployment, setActiveDeployment] = useState<{
    deploymentId: string;
    containerId: string;
    containerName: string;
    imageName?: string;
  } | null>(() => {
    const saved = getSavedActiveDeployment();
    if (saved && saved.deploymentId) {
      return {
        deploymentId: saved.deploymentId,
        containerId: saved.containerId,
        containerName: saved.containerName,
        imageName: saved.imageName
      };
    }
    return null;
  });

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(() => !!activeDeployment);
  const [webhookWizardContainer, setWebhookWizardContainer] = useState<DockerContainer | null>(null);

  const handleTriggerDeploy = useCallback(async (container: DockerContainer) => {
    const rawName = container.Names?.[0] || container.Id.slice(0, 12);
    const cleanName = rawName.replace(/^\//, '');

    try {
      const res = await deploymentsApi.triggerDeploy(container.Id);
      setActiveDeployment({
        deploymentId: res.deploymentId,
        containerId: container.Id,
        containerName: cleanName,
        imageName: container.Image
      });
      setIsDeployModalOpen(true);
      toast.success(t('deployments.deployStartedToast', { name: cleanName }));
    } catch (err: unknown) {
      const msg = (err as { message?: string } | null)?.message || t('deployments.deployFailedToast');
      toast.error(msg);
    }
  }, [toast, t]);

  return {
    activeDeployment,
    setActiveDeployment,
    isDeployModalOpen,
    setIsDeployModalOpen,
    webhookWizardContainer,
    setWebhookWizardContainer,
    handleTriggerDeploy,
  };
}
