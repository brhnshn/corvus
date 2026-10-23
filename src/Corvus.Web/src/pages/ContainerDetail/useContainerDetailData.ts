import { useState, useEffect, useCallback, useRef } from 'react';
import { api, containersApi, type DockerContainer, type DockerContainerInspectInfo, type ContainerStats } from '../../api/client';
import { useI18n } from '../../i18n';
import { useToast } from '../../components/ui/ToastContext';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import type { ContainerTelemetryPoint } from './ContainerHistoricalCharts';

export type ContainerLifecycleAction = 'start' | 'stop' | 'pause' | 'unpause' | 'restart';

/**
 * Konteyner detay sayfasının veri yükleme, canlı telemetri, yaşam döngüsü eylemleri
 * ve silme akışını yöneten hook.
 */
export function useContainerDetailData(containerId: string, onBack: () => void) {
  const { t } = useI18n();
  const toast = useToast();

  const [container, setContainer] = useState<DockerContainer | null>(null);
  const [inspect, setInspect] = useState<DockerContainerInspectInfo | null>(null);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<ContainerTelemetryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
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
  const handleAction = async (action: ContainerLifecycleAction) => {
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

  return {
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
  };
}
