import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n';
import { containersApi } from '../../../api/containers';
import type {
  DockerContainerInspectInfo,
  ContainerStats
} from '../../../types';
import { getInspectHostConfig, getInspectState } from './inspectHelpers';

export interface ResourcesStatusMessage {
  type: 'success' | 'error';
  text: string;
}

interface UseContainerResourcesOptions {
  inspect: DockerContainerInspectInfo;
  isAdmin: boolean;
  initialStats?: ContainerStats;
  onUpdated: () => void;
}

/**
 * Konteyner kaynak sekmesinin durum yönetimi:
 * canlı stats polling, limit form alanları ve kaydetme işlemi.
 */
export function useContainerResources({
  inspect,
  isAdmin,
  initialStats,
  onUpdated
}: UseContainerResourcesOptions) {
  const { t } = useI18n();

  const hostConfig = getInspectHostConfig(inspect);
  const state = getInspectState(inspect);

  // Canlı Stats State'i & Polling
  const [stats, setStats] = useState<ContainerStats | null>(initialStats || null);
  const isMountedRef = useRef(true);

  const isRunning = state.running === true;

  // Başlangıç değerleri (Inspect'ten)
  const initialNanoCpus = hostConfig.nanoCpus || 0;
  const initialCores = initialNanoCpus > 0 ? (initialNanoCpus / 1_000_000_000).toString() : '0';

  const initialMemoryBytes = hostConfig.memory || 0;
  const initialMemoryMb = initialMemoryBytes > 0 ? Math.round(initialMemoryBytes / (1024 * 1024)).toString() : '0';

  const initialRestartPolicy = hostConfig.restartPolicy?.name || 'no';

  const [cpuCores, setCpuCores] = useState<string>(initialCores);
  const [memoryMb, setMemoryMb] = useState<string>(initialMemoryMb);
  const [restartPolicy, setRestartPolicy] = useState<string>(initialRestartPolicy);
  const [prevInitial, setPrevInitial] = useState({ initialCores, initialMemoryMb, initialRestartPolicy });

  if (
    initialCores !== prevInitial.initialCores ||
    initialMemoryMb !== prevInitial.initialMemoryMb ||
    initialRestartPolicy !== prevInitial.initialRestartPolicy
  ) {
    setPrevInitial({ initialCores, initialMemoryMb, initialRestartPolicy });
    setCpuCores(initialCores);
    setMemoryMb(initialMemoryMb);
    setRestartPolicy(initialRestartPolicy);
  }

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<ResourcesStatusMessage | null>(null);

  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Canlı telemetri verilerini çek
  useEffect(() => {
    isMountedRef.current = true;

    // Eğer konteyner çalışıyorsa 2.5 saniyede bir stats güncelle
    if (!isRunning || !inspect.id) return;

    let timer: ReturnType<typeof setInterval>;

    const fetchLiveStats = async () => {
      try {
        const live = await containersApi.getContainerStats(inspect.id);
        if (isMountedRef.current && live) {
          setStats(live);
        }
      } catch {
        // Sessiz hata (arka plan telemetrisi)
      }
    };

    // İlk stats boşsa hemen çek
    if (!statsRef.current) {
      fetchLiveStats();
    }

    timer = setInterval(fetchLiveStats, 2500);

    return () => {
      isMountedRef.current = false;
      clearInterval(timer);
    };
  }, [inspect.id, isRunning]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const parsedCores = parseFloat(cpuCores);
      if (!isNaN(parsedCores) && parsedCores < 0) {
        setStatusMessage({
          type: 'error',
          text: t('containers.validationCpuNegative')
        });
        setSaving(false);
        return;
      }

      const parsedMemory = parseInt(memoryMb, 10);
      if (!isNaN(parsedMemory) && ((parsedMemory > 0 && parsedMemory < 6) || parsedMemory < 0)) {
        setStatusMessage({
          type: 'error',
          text: t('containers.validationMemoryMin')
        });
        setSaving(false);
        return;
      }

      const res = await containersApi.updateContainerResources(inspect.id, {
        cpuCores: !isNaN(parsedCores) ? parsedCores : 0,
        memoryMb: !isNaN(parsedMemory) ? parsedMemory : 0,
        restartPolicy
      });
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message ?? t('containers.updateResourcesSuccess')
        });
        onUpdated();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message ?? t('containers.updateResourcesError')
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('containers.updateResourcesError');
      setStatusMessage({
        type: 'error',
        text: msg
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    stats,
    isRunning,
    initialNanoCpus,
    initialMemoryBytes,
    cpuCores,
    setCpuCores,
    memoryMb,
    setMemoryMb,
    restartPolicy,
    setRestartPolicy,
    saving,
    statusMessage,
    handleSave
  };
}
