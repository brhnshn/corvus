import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../api';
import type { SystemSummaryDto, SystemStatusDto } from '../../types';
import { useLoadEffect } from '../../hooks/useLoadEffect';

export function useSystemsPageState() {
  const [systems, setSystems] = useState<SystemSummaryDto[]>([]);
  const [status, setStatus] = useState<SystemStatusDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [sysList, st] = await Promise.all([
        api.getSystems(),
        api.getStatus()
      ]);
      setSystems(sysList);
      setStatus(st);
    } catch (err) {
      console.error('Sistemler listesi çekilemedi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useLoadEffect(loadData);

  useEffect(() => {
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredSystems = useMemo(() => {
    return systems
      .filter(s => {
        if (statusFilter !== 'all' && s.status !== statusFilter) return false;
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          (s.hostname && s.hostname.toLowerCase().includes(q)) ||
          (s.ipAddress && s.ipAddress.toLowerCase().includes(q)) ||
          s.tags.some(t => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'cpu') {
          return (b.currentCpuPercent || 0) - (a.currentCpuPercent || 0);
        }
        if (sortBy === 'ram') {
          return (b.currentRamUsedBytes || 0) - (a.currentRamUsedBytes || 0);
        }
        if (sortBy === 'lastSeen') {
          return (b.lastSeenAt || '').localeCompare(a.lastSeenAt || '');
        }
        return a.name.localeCompare(b.name);
      });
  }, [systems, statusFilter, searchQuery, sortBy]);

  return {
    systems,
    filteredSystems,
    status,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    isAddOpen,
    setIsAddOpen,
    selectedSystemId,
    setSelectedSystemId,
    refresh: loadData
  };
}
