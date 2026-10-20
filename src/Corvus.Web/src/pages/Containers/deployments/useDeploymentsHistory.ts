import { useState, useEffect, useCallback } from 'react';
import { deploymentsApi, type GetDeploymentsParams } from '../../../api/deployments';
import type { DeploymentRecord } from '../../../types/deployments';
import { useLoadEffect } from '../../../hooks/useLoadEffect';

export function useDeploymentsHistory(params?: GetDeploymentsParams) {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetId = params?.targetId;
  const limit = params?.limit;

  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deploymentsApi.getDeployments({ targetId, limit });
      setDeployments(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  }, [targetId, limit]);

  useLoadEffect(fetchDeployments);

  useEffect(() => {
    // Listen to global corvus_event for background updates
    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (type?.includes('deployment')) {
        fetchDeployments();
      }
    };

    window.addEventListener('corvus_event', handleCorvusEvent);
    return () => {
      window.removeEventListener('corvus_event', handleCorvusEvent);
    };
  }, [fetchDeployments]);

  return {
    deployments,
    loading,
    error,
    refresh: fetchDeployments
  };
}
