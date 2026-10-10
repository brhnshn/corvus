import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api, type DockerContainer, type ContainerStats } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import { extractContainerTags } from './ContainerRow';

export interface UseContainersPageStateProps {
  initialAction?: string | null;
}

export function useContainersPageState({ initialAction }: UseContainersPageStateProps = {}) {
  const toast = useToast();

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

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [showPruneModal, setShowPruneModal] = useState(initialAction === 'prune');
  const [viewMode, setViewMode] = useState<'flat' | 'compose'>('flat');
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
      setContainers(data);

      const runningContainers = data.filter((c) => c.State.toLowerCase() === 'running');
      fetchStatsBackground(runningContainers);
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Container listesi alınamadı', err);
        toast.error('Konteyner listesi alınamadı');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    }
  }, [fetchStatsBackground, toast]);

  useEffect(() => {
    isMountedRef.current = true;
    loadContainers();

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

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
    };
  }, [loadContainers]);

  const handleAction = async (
    action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart',
    id: string,
    name: string
  ) => {
    const actionLabels: Record<string, string> = {
      start: 'başlatılıyor',
      stop: 'durduruluyor',
      pause: 'duraklatılıyor',
      unpause: 'devam ettiriliyor',
      restart: 'yeniden başlatılıyor',
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

      toast.success(`"${name}" işlemi tamamlandı`);
      await loadContainers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İşlem gerçekleştirilemedi');
    } finally {
      setActionInProgress(null);
    }
  };

  const tagsWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of containers) {
      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels);
      for (const t of tags) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [containers]);

  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      const rawName = c.Names?.[0] || c.Id;
      const cleanName = rawName.replace(/^\//, '').toLowerCase();
      const image = c.Image.toLowerCase();
      const q = search.toLowerCase();

      const hasPort = c.Ports?.some(
        (p) =>
          String(p.PrivatePort).includes(q) ||
          (p.PublicPort && String(p.PublicPort).includes(q))
      );

      const matchesSearch = !q || cleanName.includes(q) || image.includes(q) || hasPort;

      const tags = c.tags && c.tags.length > 0 ? c.tags : extractContainerTags(c.Labels);
      const matchesTag =
        !selectedTag || tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());

      const state = c.State.toLowerCase();
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
    toast.success('Etiketler güncellendi');
  };

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
    loadContainers,
    handleAction,
    tagsWithCounts,
    filteredContainers,
    handleTagsUpdated,
  };
}
