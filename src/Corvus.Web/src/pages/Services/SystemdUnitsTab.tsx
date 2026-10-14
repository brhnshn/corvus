import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RefreshCw, 
  Search, 
  Terminal, 
  RotateCw, 
  Play, 
  Square, 
  Copy, 
  Check, 
  AlertTriangle, 
  Server,
  Layers
} from 'lucide-react';
import { systemdApi } from '../../api/systemd';
import { systemsApi } from '../../api/systems';
import type { SystemdUnitDto, SystemSummaryDto } from '../../types';
import { useI18n } from '../../i18n';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { Button } from '../../components/ui/Button';
import { formatBytes } from '../../utils/format';
import { MotionItem } from '../../components/ui/MotionStage';

export interface SystemdUnitsTabProps {
  isAdmin?: boolean;
  selectedSystemId?: string;
}

export const SystemdUnitsTab: React.FC<SystemdUnitsTabProps> = ({
  isAdmin = true,
  selectedSystemId
}) => {
  const { t } = useI18n();
  const toast = useToast();

  const [units, setUnits] = useState<SystemdUnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'failed' | 'inactive'>('all');

  // Multi-node selection support
  const [systems, setSystems] = useState<SystemSummaryDto[]>([]);
  const [activeSystemId, setActiveSystemId] = useState<string>(selectedSystemId || 'local');

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

  useEffect(() => {
    if (selectedSystemId) {
      setActiveSystemId(selectedSystemId);
    }
  }, [selectedSystemId]);

  const loadUnits = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
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

  useEffect(() => {
    setLoading(true);
    loadUnits();
  }, [loadUnits]);

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
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      const matchesSearch = search === '' ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.description.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === 'active') {
        return u.activeState.toLowerCase() === 'active';
      }
      if (filter === 'failed') {
        return u.activeState.toLowerCase() === 'failed';
      }
      if (filter === 'inactive') {
        return u.activeState.toLowerCase() === 'inactive' || u.activeState.toLowerCase() === 'deactivating';
      }
      return true;
    });
  }, [units, search, filter]);

  const activeCount = useMemo(() => units.filter((u) => u.activeState.toLowerCase() === 'active').length, [units]);
  const failedCount = useMemo(() => units.filter((u) => u.activeState.toLowerCase() === 'failed').length, [units]);
  const inactiveCount = useMemo(() => units.filter((u) => u.activeState.toLowerCase() === 'inactive').length, [units]);

  return (
    <div className="space-y-4">
      {/* 1. Kontrol ve Filtre Şeridi */}
      <MotionItem staggerIndex={0}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-lg p-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('services.systemdSearchPlaceholder')}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cloud-300)]"
              />
            </div>
            {systems.length > 0 && (
              <select
                value={activeSystemId}
                onChange={(e) => setActiveSystemId(e.target.value)}
                aria-label={t('services.systemdTitle')}
                className="text-xs bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--cloud-300)]"
              >
                <option value="local">{t('services.systemdLocalHost')}</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.ipAddress || s.hostname || s.id.substring(0, 8)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <SegmentedTabs
              size="sm"
              tabs={[
                { id: 'all', label: t('services.systemdFilterAll'), meta: units.length },
                { id: 'active', label: t('services.systemdFilterActive'), meta: activeCount },
                { id: 'failed', label: t('services.systemdFilterFailed'), meta: failedCount },
                { id: 'inactive', label: t('services.systemdFilterInactive'), meta: inactiveCount },
              ]}
              activeTab={filter}
              onChange={(id) => setFilter(id as typeof filter)}
            />

            <Button
              variant="default"
              size="sm"
              onClick={() => loadUnits(true)}
              isLoading={refreshing}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            />
          </div>
        </div>
      </MotionItem>

      {/* Linux Harici Bilgilendirme Şeridi */}
      {units.length === 0 && !loading && (
        <MotionItem staggerIndex={1}>
          <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--border-hairline)] text-center space-y-2">
            <Layers className="w-8 h-8 mx-auto text-[var(--text-muted)]" />
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              {t('services.systemdNoUnits')}
            </h4>
            <p className="text-xs text-[var(--text-muted)] max-w-lg mx-auto">
              {t('services.systemdNoUnitsDesc')}
            </p>
          </div>
        </MotionItem>
      )}

      {/* Yükleniyor Göstergesi */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--cloud-300)] mb-2" />
          <span className="text-xs font-mono">{t('services.systemdRefreshing')}</span>
        </div>
      )}

      {/* 2. Systemd Birimleri Listesi */}
      {!loading && filteredUnits.length > 0 && (
        <MotionItem staggerIndex={1}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-muted)] uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-2.5 px-4 font-normal">{t('services.systemdUnitCol')}</th>
                    <th className="py-2.5 px-3 font-normal">{t('services.systemdDescCol')}</th>
                    <th className="py-2.5 px-3 font-normal">{t('services.systemdStatusCol')}</th>
                    <th className="py-2.5 px-3 font-normal">{t('services.systemdSubCol')}</th>
                    <th className="py-2.5 px-3 font-normal">{t('services.systemdMemoryCol')}</th>
                    <th className="py-2.5 px-4 font-normal text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {filteredUnits.map((u) => {
                    const isRunning = u.activeState.toLowerCase() === 'active' && u.subState.toLowerCase() === 'running';
                    const isFailed = u.activeState.toLowerCase() === 'failed';
                    const isBusy = actionLoading[u.name] || false;

                    const statusType = isRunning ? 'up' : isFailed ? 'down' : 'muted';

                    return (
                      <tr 
                        key={u.name} 
                        className="hover:bg-[var(--bg-hover)] transition-colors group"
                      >
                        {/* Birim Adı */}
                        <td className="py-2.5 px-4 font-mono font-medium text-[var(--text-primary)]">
                          <div className="flex items-center gap-2">
                            <Server className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
                            <span className="truncate max-w-[220px]" title={u.name}>
                              {u.name}
                            </span>
                          </div>
                        </td>

                        {/* Açıklama */}
                        <td className="py-2.5 px-3 text-[var(--text-secondary)] max-w-xs truncate" title={u.description}>
                          {u.description || '-'}
                        </td>

                        {/* Durum Rozeti */}
                        <td className="py-2.5 px-3">
                          <StatusBadge status={statusType}>
                            {u.activeState}
                          </StatusBadge>
                        </td>

                        {/* Alt Durum */}
                        <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">
                          {u.subState || '-'}
                        </td>

                        {/* Bellek */}
                        <td className="py-2.5 px-3 font-mono tabular-nums text-[var(--text-secondary)]">
                          {typeof u.memoryBytes === 'number' && u.memoryBytes > 0 
                            ? formatBytes(u.memoryBytes) 
                            : '-'}
                        </td>

                        {/* Aksiyon Butonları */}
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Journalctl Logları */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLogs(u.name)}
                              title={t('services.systemdViewLogs')}
                              icon={<Terminal className="w-3.5 h-3.5" />}
                            />

                            {/* Yeniden Başlat */}
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setConfirmModal({ unitName: u.name, action: 'restart' })}
                              disabled={!isAdmin || isBusy}
                              isLoading={isBusy}
                              title={!isAdmin ? t('services.systemdViewerDisabled') : t('services.systemdRestart')}
                              icon={<RotateCw className="w-3.5 h-3.5" />}
                            />

                            {/* Durdur / Başlat */}
                            {isRunning ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirmModal({ unitName: u.name, action: 'stop' })}
                                disabled={!isAdmin || isBusy}
                                title={!isAdmin ? t('services.systemdViewerDisabled') : t('services.systemdStop')}
                                icon={<Square className="w-3 h-3" />}
                              />
                            ) : (
                              <Button
                                variant="cloud"
                                size="sm"
                                onClick={() => handleUnitAction(u.name, 'start')}
                                disabled={!isAdmin || isBusy}
                                title={!isAdmin ? t('services.systemdViewerDisabled') : t('services.systemdStart')}
                                icon={<Play className="w-3 h-3" />}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </MotionItem>
      )}

      {/* 3. Journalctl Logları Modalı */}
      <Modal
        isOpen={Boolean(logsModalUnit)}
        onClose={() => setLogsModalUnit(null)}
        title={t('services.systemdLogsTitle', { unit: logsModalUnit || '' })}
        subtitle={t('services.systemdLogsSubtitle')}
        icon={<Terminal className="w-5 h-5 text-[var(--cloud-200)]" />}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          {/* Üst Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--text-muted)] font-mono">
                {t('services.systemdLines')}:
              </span>
              {[50, 100, 250, 500].map((lines) => (
                <button
                  key={lines}
                  type="button"
                  onClick={() => reloadLogs(lines)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                    logLines === lines 
                      ? 'bg-[var(--cloud-200)] text-[var(--bg-canvas)] font-semibold' 
                      : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {lines}
                </button>
              ))}
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={copyLogsToClipboard}
              icon={logsCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {logsCopied ? t('services.systemdLogsCopied') : t('services.systemdCopyLogs')}
            </Button>
          </div>

          {/* Log Çıktısı Kutusu */}
          <div className="relative font-mono text-xs p-4 bg-[#0a0a0c] border border-[var(--border-hairline)] rounded-lg overflow-x-auto max-h-[60vh] select-text">
            {loadingLogs ? (
              <div className="flex items-center justify-center py-12 text-[var(--text-muted)] gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--cloud-300)]" />
                <span>{t('services.systemdRefreshing')}</span>
              </div>
            ) : logs.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-8">
                {t('services.systemdNoLogsFound')}
              </p>
            ) : (
              <pre className="text-[var(--text-primary)] whitespace-pre leading-relaxed select-text font-mono text-[11px]">
                {logs.join('\n')}
              </pre>
            )}
          </div>
        </div>
      </Modal>

      {/* 4. Onay Modalı (Restart / Stop) */}
      <Modal
        isOpen={Boolean(confirmModal)}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.action === 'restart' ? t('services.systemdRestart') : t('services.systemdStop')}
        subtitle={confirmModal?.unitName}
        icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-secondary)]">
            {confirmModal?.action === 'restart'
              ? t('services.systemdConfirmRestart', { unit: confirmModal?.unitName || '' })
              : t('services.systemdConfirmStop', { unit: confirmModal?.unitName || '' })}
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setConfirmModal(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant={confirmModal?.action === 'stop' ? 'danger' : 'cloud'}
              size="sm"
              onClick={() => {
                if (confirmModal) {
                  handleUnitAction(confirmModal.unitName, confirmModal.action);
                }
              }}
            >
              {confirmModal?.action === 'restart' ? t('services.systemdRestart') : t('services.systemdStop')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
