import { useState, useCallback } from 'react';
import { api } from '../../../api/client';
import { useI18n } from '../../../i18n';
import type { ServiceIncident } from '../../../types';
import { useLoadEffect } from '../../../hooks/useLoadEffect';

export function useIncidents() {
  const { t } = useI18n();
  const [incidents, setIncidents] = useState<ServiceIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-filter: 'all' | 'active' | 'resolved'
  const [subFilter, setSubFilter] = useState<'all' | 'active' | 'resolved'>('all');

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useLoadEffect(fetchIncidents);

  const handleResolve = async (id: string) => {
    if (!window.confirm(t('incidents.confirmResolve'))) return;
    try {
      await api.resolveIncident(id);
      fetchIncidents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('incidents.confirmDelete'))) return;
    try {
      await api.deleteIncident(id);
      fetchIncidents();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  const filteredIncidents = subFilter === 'active' 
    ? activeIncidents 
    : subFilter === 'resolved' 
    ? resolvedIncidents 
    : incidents;

  return {
    incidents,
    loading,
    error,
    subFilter,
    setSubFilter,
    fetchIncidents,
    handleResolve,
    handleDelete,
    activeIncidents,
    resolvedIncidents,
    filteredIncidents,
  };
}
