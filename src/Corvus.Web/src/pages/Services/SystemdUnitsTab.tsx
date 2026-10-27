import React from 'react';
import { RefreshCw, Layers } from 'lucide-react';
import { useI18n } from '../../i18n';
import { MotionItem } from '../../components/ui/MotionStage';
import { SystemdLogsModal } from './SystemdLogsModal';
import { SystemdConfirmModal } from './SystemdConfirmModal';
import { useSystemdUnits } from './useSystemdUnits';
import { SystemdUnitsToolbar } from './SystemdUnitsToolbar';
import { SystemdUnitRow } from './SystemdUnitRow';

export interface SystemdUnitsTabProps {
  isAdmin?: boolean;
}

export const SystemdUnitsTab: React.FC<SystemdUnitsTabProps> = ({
  isAdmin = true
}) => {
  const { t } = useI18n();
  const {
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
  } = useSystemdUnits({ isAdmin });

  return (
    <div className="space-y-4">
      {/* 1. Kontrol ve Filtre Şeridi */}
      <MotionItem staggerIndex={0}>
        <SystemdUnitsToolbar
          search={search}
          onSearchChange={setSearch}
          systems={systems}
          activeSystemId={activeSystemId}
          onSystemChange={setActiveSystemId}
          filter={filter}
          onFilterChange={setFilter}
          totalCount={units.length}
          activeCount={activeCount}
          failedCount={failedCount}
          inactiveCount={inactiveCount}
          refreshing={refreshing}
          onRefresh={() => loadUnits(true)}
        />
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
                  {filteredUnits.map((u) => (
                    <SystemdUnitRow
                      key={u.name}
                      unit={u}
                      isAdmin={isAdmin}
                      isBusy={actionLoading[u.name] || false}
                      onOpenLogs={openLogs}
                      onRequestConfirm={(unitName, action) => setConfirmModal({ unitName, action })}
                      onStart={(unitName) => handleUnitAction(unitName, 'start')}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </MotionItem>
      )}

      {/* 3. Journalctl Logları Modalı */}
      <SystemdLogsModal
        unitName={logsModalUnit}
        isOpen={Boolean(logsModalUnit)}
        onClose={() => setLogsModalUnit(null)}
        logs={logs}
        loadingLogs={loadingLogs}
        logLines={logLines}
        logsCopied={logsCopied}
        onReloadLogs={reloadLogs}
        onCopyLogs={copyLogsToClipboard}
      />

      {/* 4. Onay Modalı (Restart / Stop) */}
      <SystemdConfirmModal
        confirmModal={confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={handleUnitAction}
      />
    </div>
  );
};
