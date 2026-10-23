import { useState, useMemo, type FormEvent } from 'react';
import { useI18n } from '../../i18n';
import { deploymentsApi } from '../../api/deployments';
import type { DockerContainer } from '../../types';
import type {
  ScratchDeploymentRequest,
  ContainerConnectionTestResult
} from '../../types/deployments';
import { getContainerName, filterDeployableContainers } from './newDeployment.utils';

export type NewDeploymentTab = 'scratch' | 'existing';

interface UseNewDeploymentFormArgs {
  containers: DockerContainer[];
  onClose: () => void;
  onTriggerScratchDeploy: (req: ScratchDeploymentRequest) => Promise<void>;
}

/** Yeni dağıtım modalının sekme, sıfırdan dağıtım formu ve bağlantı testi durumları. */
export function useNewDeploymentForm({ containers, onClose, onTriggerScratchDeploy }: UseNewDeploymentFormArgs) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<NewDeploymentTab>('scratch');

  // Scratch Form State
  const [image, setImage] = useState('');
  const [containerName, setContainerName] = useState('');
  const [ports, setPorts] = useState('');
  const [env, setEnv] = useState('');
  const [restartPolicy, setRestartPolicy] = useState('unless-stopped');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Existing Form State
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ContainerConnectionTestResult | null>(null);

  const deployableContainers = useMemo(() => filterDeployableContainers(containers), [containers]);

  const selectedContainer = deployableContainers.find(c => c.Id === selectedContainerId);
  const containerDisplayName = getContainerName(selectedContainer);

  const selectTab = (tab: NewDeploymentTab) => {
    setActiveTab(tab);
    setErrorMsg(null);
  };

  const selectContainer = (id: string) => {
    setSelectedContainerId(id);
    setTestResult(null);
  };

  const handleScratchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!image.trim() || !containerName.trim()) return;

    const lowerName = containerName.trim().toLowerCase();
    const lowerImg = image.trim().toLowerCase();
    if (lowerName.includes('corvus') || lowerImg.includes('corvus')) {
      setErrorMsg(t('deployments.selfPreservationGuard'));
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await onTriggerScratchDeploy({
        image: image.trim(),
        containerName: containerName.trim(),
        ports: ports.trim() || undefined,
        env: env.trim() || undefined,
        restartPolicy
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || t('deployments.deployGenericError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedContainerId) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await deploymentsApi.testContainerConnection(selectedContainerId);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        containerId: selectedContainerId,
        name: containerDisplayName || selectedContainerId,
        isRunning: false,
        status: 'error',
        exposedPorts: [],
        canConnect: false,
        message: err?.message || t('deployments.connectionFailed')
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return {
    activeTab,
    selectTab,
    scratchForm: { image, containerName, ports, env, restartPolicy },
    setImage,
    setContainerName,
    setPorts,
    setEnv,
    setRestartPolicy,
    submitting,
    errorMsg,
    handleScratchSubmit,
    deployableContainers,
    selectedContainerId,
    selectContainer,
    selectedContainer,
    containerDisplayName,
    testingConnection,
    testResult,
    handleTestConnection,
  };
}
