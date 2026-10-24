import { useState, useCallback } from 'react';
import { containersApi } from '../../../api/containers';
import { useLoadEffect } from '../../../hooks/useLoadEffect';
import type { DockerContainerInspectInfo } from '../../../types';

export type DetailTabType = 'overview' | 'env' | 'networking' | 'storage' | 'resources' | 'deployments';

export interface UseContainerInspectOptions {
  containerId: string | null;
  isOpen: boolean;
  initialTab?: DetailTabType;
  onContainerActionSuccess?: () => void;
}

export function useContainerInspect({
  containerId,
  isOpen,
  initialTab = 'overview',
  onContainerActionSuccess,
}: UseContainerInspectOptions) {
  const [activeTab, setActiveTab] = useState<DetailTabType>(initialTab);
  const [inspectData, setInspectData] = useState<DockerContainerInspectInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadInspectData = useCallback(async () => {
    if (!containerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await containersApi.inspectContainer(containerId);
      setInspectData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load container details');
    } finally {
      setLoading(false);
    }
  }, [containerId]);

  const [prevOpenState, setPrevOpenState] = useState({ isOpen, containerId, initialTab });
  if (
    prevOpenState.isOpen !== isOpen ||
    prevOpenState.containerId !== containerId ||
    prevOpenState.initialTab !== initialTab
  ) {
    setPrevOpenState({ isOpen, containerId, initialTab });
    if (isOpen && containerId) {
      setActiveTab(initialTab);
    } else {
      setInspectData(null);
      setError(null);
    }
  }

  const loadDataWhenOpen = useCallback(() => {
    if (isOpen && containerId) {
      loadInspectData();
    }
  }, [isOpen, containerId, loadInspectData]);

  useLoadEffect(loadDataWhenOpen);

  const handleAction = async (actionFn: () => Promise<any>) => {
    setActionLoading(true);
    try {
      await actionFn();
      await loadInspectData();
      if (onContainerActionSuccess) {
        onContainerActionSuccess();
      }
    } catch (err) {
      console.error('Container action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    inspectData,
    loading,
    error,
    actionLoading,
    loadInspectData,
    handleAction,
  };
}
