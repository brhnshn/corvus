import { useState, useEffect, useCallback, useRef } from 'react';
import { api, invalidateCache, type DockerContainer, type ContainerStats } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastContext';
import { useI18n } from '../../../i18n';
import { useLoadEffect } from '../../../hooks/useLoadEffect';

export function useContainersData() {
  const toast = useToast();
  const { t } = useI18n();

  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, ContainerStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  return {
    containers,
    setContainers,
    statsMap,
    loading,
    refreshing,
    loadContainers,
  };
}
