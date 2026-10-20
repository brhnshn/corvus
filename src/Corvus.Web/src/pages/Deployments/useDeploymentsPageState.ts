import { useState, useEffect, useCallback, useMemo } from 'react';
import { deploymentsApi } from '../../api/deployments';
import { fetchJson } from '../../api/http';
import type { 
  DeploymentRecord, 
  ActiveDeploymentState, 
  ScratchDeploymentRequest
} from '../../types/deployments';
import { getSavedActiveDeployment } from '../Containers/deployments/useDeploymentStream';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import type { DockerContainer } from '../../types';

export function useDeploymentsPageState() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Arama & Filtre
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');

  // Modallar
  const [isNewDeploymentModalOpen, setIsNewDeploymentModalOpen] = useState<boolean>(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [selectedContainerForWebhook, setSelectedContainerForWebhook] = useState<DockerContainer | null>(null);

  // Canlı Dağıtım Modalı Durumu
  const [activeDeployment, setActiveDeployment] = useState<ActiveDeploymentState | null>(() => getSavedActiveDeployment());

  // Verileri çek
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const [depList, contList] = await Promise.all([
        deploymentsApi.getDeployments({ limit: 100 }),
        fetchJson<DockerContainer[]>('/containers').catch(() => [])
      ]);
      setDeployments(depList);
      setContainers(contList);
    } catch (err) {
      console.error('Failed to load deployments or containers:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useLoadEffect(fetchData);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Metrikler
  const stats = useMemo(() => {
    const total = deployments.length;
    const successes = deployments.filter(d => d.status === 'success');
    const successRate = total > 0 ? (successes.length / total) * 100 : 100;
    const active = deployments.filter(d => d.status === 'pending' || d.status === 'in_progress').length;
    
    const sumDurations = successes.reduce((acc, curr) => acc + (curr.durationMs || 0), 0);
    const avgDurationMs = successes.length > 0 ? sumDurations / successes.length : 0;

    return {
      total,
      successRate,
      active,
      avgDurationMs
    };
  }, [deployments]);

  // Filtrelenmiş liste
  const filteredDeployments = useMemo(() => {
    return deployments.filter(item => {
      if (statusFilter === 'success' && item.status !== 'success') return false;
      if (statusFilter === 'failed' && item.status !== 'failed' && item.status !== 'rolled_back') return false;
      if (statusFilter === 'pending' && item.status !== 'pending' && item.status !== 'in_progress') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.targetName?.toLowerCase().includes(q);
        const matchesImage = item.imageName?.toLowerCase().includes(q);
        const matchesId = item.id?.toLowerCase().includes(q);
        return matchesName || matchesImage || matchesId;
      }

      return true;
    });
  }, [deployments, statusFilter, searchQuery]);

  // Sıfırdan Dağıtımı Başlat
  const handleTriggerScratchDeploy = async (req: ScratchDeploymentRequest) => {
    const res = await deploymentsApi.triggerScratchDeploy(req);
    const initState: ActiveDeploymentState = {
      deploymentId: res.deploymentId,
      containerId: req.containerName,
      containerName: req.containerName,
      imageName: req.image,
      status: 'pending',
      currentStep: 'queued',
      startedAt: Date.now(),
      logs: []
    };
    setActiveDeployment(initState);
    setIsNewDeploymentModalOpen(false);
    fetchData(true);
  };

  // Mevcut Konteyneri Dağıt
  const handleTriggerExistingDeploy = async (container: DockerContainer) => {
    const res = await deploymentsApi.triggerDeploy(container.Id);
    const containerName = container.Names?.[0]?.replace(/^\//, '') || container.Id.slice(0, 12);
    const initState: ActiveDeploymentState = {
      deploymentId: res.deploymentId,
      containerId: container.Id,
      containerName,
      imageName: container.Image,
      status: 'pending',
      currentStep: 'queued',
      startedAt: Date.now(),
      logs: []
    };
    setActiveDeployment(initState);
    setIsNewDeploymentModalOpen(false);
    fetchData(true);
  };

  // Webhook Sihirbazını Aç
  const handleOpenWebhookWizard = (container: DockerContainer) => {
    setSelectedContainerForWebhook(container);
    setIsWebhookModalOpen(true);
  };

  return {
    deployments: filteredDeployments,
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
    refresh: () => fetchData(false)
  };
}
