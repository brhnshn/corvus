import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api, invalidateCache, type DockerContainer, type ContainerStats } from '../../api/client';
import { deploymentsApi } from '../../api/deployments';
import { getSavedActiveDeployment } from './deployments/useDeploymentStream';
import { useToast } from '../../components/ui/ToastContext';
import { useI18n } from '../../i18n';
import { extractContainerTags } from './utils/containerTags';
import { useLoadEffect } from '../../hooks/useLoadEffect';

export interface UseContainersPageStateProps {
  initialAction?: string | null;
}

export function useContainersPageState({ initialAction }: UseContainersPageStateProps = {}) {
  const toast = useToast();
  const { t } = useI18n();

  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, ContainerStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [actionInProgress, setActionInProgress] = useState<{ id: string; action: string } | null>(null);
  const [selectedLogsContainer, setSelectedLogsContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedTerminalContainer, setSelectedTerminalContainer] = useState<{ id: string; name: string } | null>(null);
  const [selectedInspectContainer, setSelectedInspectContainer] = useState<DockerContainer | null>(null);
  const [editingTagsContainer, setEditingTagsContainer] = useState<DockerContainer | null>(null);
  const [sheetContainer, setSheetContainer] = useState<DockerContainer | null>(null);
  const [imageUpdateContainer, setImageUpdateContainer] = useState<{ id: string; name: string; image: string } | null>(null);
  const [composeConfigProject, setComposeConfigProject] = useState<string | null>(null);

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

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showPruneModal, setShowPruneModal] = useState(initialAction === 'prune');
  const [viewMode, setViewMode] = useState<'flat' | 'compose'>('flat');
  const [deletingContainer, setDeletingContainer] = useState<DockerContainer | null>(null);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleteVolumes, setDeleteVolumes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMountedRef = useRef(true);

  const fetchStatsBackground = useCallback(async (runningContainers: DockerContainer[]) => {
    if (runningContainers.length === 0) return;
    try {
      const summary = await api.getContainersStatsSummary();
      if (summary && isMountedRef.current) {
        setStatsMap(summary);
      }
    } catch {
      // stats background fallback
    }
  }, []);

  const loadContainers = useCallback(async (isManual = false) => {
    if (isManual && isMountedRef.current) setRefreshing(true);
    try {
      const data = await api.getContainers();
      if (!isMountedRef.current) return;
      const list = Array.isArray(data) ? data : [];
      setContainers(list);

      const runningContainers = list.filter((c) => (c?.State || '').toLowerCase() === 'running');
      fetchStatsBackground(runningContainers);
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Container listesi alınamadı', err);
        toast.error(t('containers.loadContainersError'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    }
  }, [fetchStatsBackground, toast, t]);

  useLoadEffect(loadContainers);

  useEffect(() => {
    isMountedRef.current = true;

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadContainers();
    }, 20000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadContainers();
    };

    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (type?.includes('container') && isMountedRef.current) {
        loadContainers();
      }
    };

    const handleSystemChange = () => {
      invalidateCache();
      if (isMountedRef.current) {
        loadContainers(true);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);
    window.addEventListener('corvus_active_system_changed', handleSystemChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
      window.removeEventListener('corvus_active_system_changed', handleSystemChange);
    };
  }, [loadContainers]);

  const handleAction = async (
    action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart',
    id: string,
    name: string
  ) => {
    const actionLabels: Record<string, string> = {
      start: t('containers.actionInProgressStart'),
      stop: t('containers.actionInProgressStop'),
      pause: t('containers.actionInProgressPause'),
      unpause: t('containers.actionInProgressUnpause'),
      restart: t('containers.actionInProgressRestart'),
    };

    setActionInProgress({ id, action });
    toast.info(`"${name}" ${actionLabels[action]}…`);

    try {
      if (action === 'start') await api.startContainer(id);
      else if (action === 'stop') await api.stopContainer(id);
      else if (action === 'pause') await api.pauseContainer(id);
      else if (action === 'unpause') await api.unpauseContainer(id);
      else if (action === 'restart') await api.restartContainer(id);

      setContainers((prev) =>
        prev.map((c) => {
          if (c.Id === id) {
            let newState = c.State;
            let newStatus = c.Status;
            if (action === 'start') {
              newState = 'running';
              newStatus = 'Up (just now)';
            } else if (action === 'stop') {
              newState = 'exited';
              newStatus = 'Exited (just now)';
            } else if (action === 'pause') {
              newState = 'paused';
              newStatus = 'Paused';
            } else if (action === 'unpause') {
              newState = 'running';
              newStatus = 'Up';
            }
            return { ...c, State: newState, Status: newStatus };
          }
          return c;
        })
      );

      toast.success(t('containers.actionCompletedToast', { name }));
      await loadContainers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('containers.actionFailedToast'));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingContainer) return;
    const rawName = deletingContainer.Names?.[0] || deletingContainer.Id.slice(0, 12);
    const cleanName = rawName.replace(/^\//, '');
    const isRunning = (deletingContainer.State || '').toLowerCase() === 'running';

    setIsDeleting(true);
    try {
      await api.deleteContainer(deletingContainer.Id, isRunning ? true : deleteForce, deleteVolumes);
      setContainers((prev) => prev.filter((c) => c.Id !== deletingContainer.Id));
      toast.success(t('containers.deleteSuccess', { name: cleanName }));
      setDeletingContainer(null);
      setDeleteForce(false);
      setDeleteVolumes(false);
      await loadContainers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('containers.deleteError', { name: cleanName }));
    } finally {
      setIsDeleting(false);
    }
  };

  const tagsWithCounts = useMemo(() => {
    if (!Array.isArray(containers)) return [];
    const counts: Record<string, number> = {};
    for (const c of containers) {
      if (!c) continue;
      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels || {});
      for (const t of tags) {
        if (!t) continue;
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [containers]);

  const filteredContainers = useMemo(() => {
    if (!Array.isArray(containers)) return [];
    return containers.filter((c) => {
      if (!c) return false;
      const rawName = c.Names?.[0] || c.Id || 'unknown';
      const cleanName = (rawName || '').replace(/^\//, '').toLowerCase();
      const image = (c.Image || '').toLowerCase();
      const q = (search || '').toLowerCase().trim();

      const hasPort = c.Ports?.some(
        (p) =>
          (p?.PrivatePort != null && String(p.PrivatePort).includes(q)) ||
          (p?.PublicPort != null && String(p.PublicPort).includes(q))
      ) ?? false;

      const matchesSearch = !q || cleanName.includes(q) || image.includes(q) || hasPort;

      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels || {});
      const matchesTag =
        !selectedTag || tags.some((t) => (t || '').toLowerCase() === selectedTag.toLowerCase());

      const state = (c.State || 'unknown').toLowerCase();
      const matchesState =
        !selectedState ||
        (selectedState === 'running' && state === 'running') ||
        (selectedState === 'paused' && state === 'paused') ||
        (selectedState === 'stopped' && ['exited', 'dead', 'created'].includes(state));

      return matchesSearch && matchesTag && matchesState;
    });
  }, [containers, search, selectedTag, selectedState]);

  const handleTagsUpdated = (updatedTags: string[]) => {
    if (!editingTagsContainer) return;
    const containerId = editingTagsContainer.Id;
    setContainers((prev) =>
      prev.map((c) => (c.Id === containerId ? { ...c, tags: updatedTags } : c))
    );
    toast.success(t('containers.tagsUpdatedToast'));
  };

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
    } catch (err: any) {
      const msg = err?.message || t('deployments.deployFailedToast');
      toast.error(msg);
    }
  }, [toast, t]);

  return {
    containers,
    statsMap,
    loading,
    refreshing,
    search,
    setSearch,
    actionInProgress,
    selectedLogsContainer,
    setSelectedLogsContainer,
    selectedTerminalContainer,
    setSelectedTerminalContainer,
    selectedInspectContainer,
    setSelectedInspectContainer,
    editingTagsContainer,
    setEditingTagsContainer,
    sheetContainer,
    setSheetContainer,
    imageUpdateContainer,
    setImageUpdateContainer,
    composeConfigProject,
    setComposeConfigProject,
    selectedTag,
    setSelectedTag,
    selectedState,
    setSelectedState,
    showPruneModal,
    setShowPruneModal,
    viewMode,
    setViewMode,
    deletingContainer,
    setDeletingContainer,
    deleteForce,
    setDeleteForce,
    deleteVolumes,
    setDeleteVolumes,
    isDeleting,
    handleConfirmDelete,
    loadContainers,
    handleAction,
    tagsWithCounts,
    filteredContainers,
    handleTagsUpdated,
    activeDeployment,
    setActiveDeployment,
    isDeployModalOpen,
    setIsDeployModalOpen,
    webhookWizardContainer,
    setWebhookWizardContainer,
    handleTriggerDeploy
  };
}
