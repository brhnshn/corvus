import { useState, useEffect, useCallback, useMemo } from 'react';
import { systemdApi } from '../../api/systemd';
import { systemsApi } from '../../api/systems';
import type { SystemdUnitDto, SystemSummaryDto } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../../components/ui/ToastContext';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import { useActiveSystem } from '../../hooks/useActiveSystem';
import { DEFAULT_SYSTEM_ID } from '../../hooks/activeSystemStore';
import { filterSystemdUnits, countUnitsByState, type SystemdUnitFilter } from './systemdUnits.utils';

interface UseSystemdUnitsOptions {
  isAdmin: boolean;
}

/** Systemd API'sinde yerel host 'local' ile temsil edilir; merkezi store ise 'local-host' kullanır. */
const SYSTEMD_LOCAL_ID = 'local';

/** Systemd birimlerinin yüklenmesi, journalctl logları ve birim kontrol aksiyonlarını yönetir. */
export const useSystemdUnits = ({ isAdmin }: UseSystemdUnitsOptions) => {
  const { t } = useI18n();
  const toast = useToast();

  const [units, setUnits] = useState<SystemdUnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SystemdUnitFilter>('all');

  // Multi-node selection support
  const [systems, setSystems] = useState<SystemSummaryDto[]>([]);
  const { systemId: storeSystemId, setActiveSystem } = useActiveSystem();
  const activeSystemId = storeSystemId === DEFAULT_SYSTEM_ID ? SYSTEMD_LOCAL_ID : storeSystemId;
  const setActiveSystemId = useCallback((id: string) => {
    if (id === SYSTEMD_LOCAL_ID) {
      setActiveSystem(DEFAULT_SYSTEM_ID);
      return;
    }
    const name = systems.find((s) => s.id === id)?.name;
    setActiveSystem(id, name);
  }, [setActiveSystem, systems]);

  // Logs modal state
  const [logsModalUnit, setLogsModalUnit] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logLines, setLogLines] = useState<number>(100);
  const [logsCopied, setLogsCopied] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    unitName: string;
    action: 'restart' | 'stop';
  } | null>(null);

  // Load systems for multi-node dropdown
  useEffect(() => {
    systemsApi.getSystems()
      .then((data) => {
        if (Array.isArray(data)) setSystems(data);
      })
      .catch(() => {});
  }, []);

  const loadUnits = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await systemdApi.getUnits(activeSystemId);
      setUnits(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      console.error('Failed to load systemd units', err);
      toast.error(t('services.systemdActionFailed'));
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [activeSystemId, toast, t]);

  useLoadEffect(loadUnits);

  // Open Logs Modal
  const openLogs = async (unitName: string) => {
    setLogsModalUnit(unitName);
    setLoadingLogs(true);
    setLogs([]);
    setLogsCopied(false);
    try {
      const res = await systemdApi.getLogs(unitName, logLines, activeSystemId);
      setLogs(res.logs || []);
    } catch (err: unknown) {
      console.error('Failed to fetch journalctl logs', err);
      toast.error(t('services.systemdActionFailed'));
    } finally {
      setLoadingLogs(false);
    }
  };

  const reloadLogs = async (lines: number) => {
    if (!logsModalUnit) return;
    setLogLines(lines);
    setLoadingLogs(true);
    try {
      const res = await systemdApi.getLogs(logsModalUnit, lines, activeSystemId);
      setLogs(res.logs || []);
    } catch {
      toast.error(t('services.systemdActionFailed'));
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyLogsToClipboard = () => {
    if (!logs.length) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setLogsCopied(true);
    toast.success(t('services.systemdLogsCopied'));
    setTimeout(() => setLogsCopied(false), 2000);
  };

  // Unit control action
  const handleUnitAction = async (unitName: string, action: 'start' | 'stop' | 'restart') => {
    if (!isAdmin) return;
    setActionLoading((prev) => ({ ...prev, [unitName]: true }));
    try {
      const res = await systemdApi.controlUnit(unitName, action, activeSystemId);
      if (res.success) {
        toast.success(res.message || t('services.systemdActionSuccess'));
        await loadUnits(false);
      } else {
        toast.error(res.message || t('services.systemdActionFailed'));
      }
    } catch (err: unknown) {
      console.error(`Failed to execute ${action} on ${unitName}`, err);
      toast.error(t('services.systemdActionFailed'));
    } finally {
      setActionLoading((prev) => ({ ...prev, [unitName]: false }));
      setConfirmModal(null);
    }
  };

  // Filtered units
  const filteredUnits = useMemo(() => filterSystemdUnits(units, search, filter), [units, search, filter]);

  const activeCount = useMemo(() => countUnitsByState(units, 'active'), [units]);
  const failedCount = useMemo(() => countUnitsByState(units, 'failed'), [units]);
  const inactiveCount = useMemo(() => countUnitsByState(units, 'inactive'), [units]);

  return {
    units,
    loading,
    refreshing,
    search,
    setSearch,
    filter,
    setFilter,
    systems,
    activeSystemId,
    setActiveSystemId,
    logsModalUnit,
    setLogsModalUnit,
    logs,
    loadingLogs,
    logLines,
    logsCopied,
    actionLoading,
    confirmModal,
    setConfirmModal,
    loadUnits,
    openLogs,
    reloadLogs,
    copyLogsToClipboard,
    handleUnitAction,
    filteredUnits,
    activeCount,
    failedCount,
    inactiveCount
  };
};
