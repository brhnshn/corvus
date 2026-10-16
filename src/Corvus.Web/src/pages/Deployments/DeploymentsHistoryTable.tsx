import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import type { DeploymentRecord } from '../../types/deployments';
import { Pill } from '../../components/ui/Pill';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterChip } from '../../components/ui/FilterChip';
import { EmptyState } from '../../components/ui/EmptyState';
import { DeploymentTerminalLog } from '../Containers/deployments/DeploymentTerminalLog';
import { formatRelativeTime } from '../../utils/format';
import { 
  GitBranch, 
  Terminal, 
  Clock, 
  Layers
} from 'lucide-react';

export interface DeploymentsHistoryTableProps {
  deployments: DeploymentRecord[];
  loading?: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: 'all' | 'success' | 'failed' | 'pending';
  setStatusFilter: (filter: 'all' | 'success' | 'failed' | 'pending') => void;
}

export const DeploymentsHistoryTable: React.FC<DeploymentsHistoryTableProps> = ({
  deployments,
  loading = false,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter
}) => {
  const { t } = useI18n();
  const [selectedLogRecord, setSelectedLogRecord] = useState<DeploymentRecord | null>(null);

  const getStatusBadge = (record: DeploymentRecord) => {
    switch (record.status) {
      case 'success':
        return <Pill status="ok" label={t('deployments.statusSuccess')} />;
      case 'failed':
        return <Pill status="err" label={t('deployments.statusFailed')} />;
      case 'rolled_back':
        return <Pill status="warn" label={t('deployments.statusRolledBack')} />;
      case 'in_progress':
        return <Pill status="info" label={t('deployments.statusInProgress')} />;
      default:
        return <Pill status="neutral" label={t('deployments.statusPending')} />;
    }
  };

  const getTriggerBadge = (record: DeploymentRecord) => {
    switch (record.triggerType) {
      case 'webhook_github':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <GitBranch className="w-3 h-3" />
            GitHub
          </span>
        );
      case 'manual_scratch':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers className="w-3 h-3" />
            {t('deployments.triggerScratch')}
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            {t('deployments.triggerScheduled')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-white/[0.05] text-[var(--text-muted)] border border-[var(--border-subtle)]">
            {t('deployments.triggerManual')}
          </span>
        );
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '-';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    const secs = (ms / 1000).toFixed(1);
    return `${secs} s`;
  };

  return (
    <Card className="overflow-hidden">
      {/* Tablo Üst Başlık & Filtreler */}
      <CardHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48 sm:w-60">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('deployments.searchPlaceholder')}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <FilterChip
                label={t('deployments.filterAll')}
                selected={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <FilterChip
                label={t('deployments.filterSuccess')}
                dotColor="var(--status-up)"
                selected={statusFilter === 'success'}
                onClick={() => setStatusFilter('success')}
              />
              <FilterChip
                label={t('deployments.filterFailed')}
                dotColor="var(--status-down)"
                selected={statusFilter === 'failed'}
                onClick={() => setStatusFilter('failed')}
              />
              <FilterChip
                label={t('deployments.filterPending')}
                dotColor="var(--status-warn)"
                selected={statusFilter === 'pending'}
                onClick={() => setStatusFilter('pending')}
              />
            </div>
          </div>
        }
      >
        <CardTitle className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[var(--cloud-400)]" />
          <span>{t('deployments.historyTitle')}</span>
          <span className="text-xs text-[var(--text-muted)] font-mono font-normal">
            ({deployments.length})
          </span>
        </CardTitle>
      </CardHeader>

      {/* Tablo İçeriği */}
      {loading && deployments.length === 0 ? (
        <div className="py-16 text-center text-xs text-[var(--text-muted)]">
          {t('common.loading')}
        </div>
      ) : deployments.length === 0 ? (
        <EmptyState
          icon={<GitBranch className="w-6 h-6" />}
          title={t('deployments.noDeployments')}
          description={t('deployments.noDeploymentsDesc')}
          className="border-none bg-transparent"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t('deployments.colStatus')}</th>
                <th className="py-3 px-4">{t('deployments.colTarget')}</th>
                <th className="py-3 px-4">{t('deployments.colTrigger')}</th>
                <th className="py-3 px-4">{t('deployments.colImageDigest')}</th>
                <th className="py-3 px-4">{t('deployments.colDuration')}</th>
                <th className="py-3 px-4">{t('deployments.colDate')}</th>
                <th className="py-3 px-4 text-right">{t('deployments.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] font-mono">
              {deployments.map((record) => (
                <tr key={record.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(record)}
                  </td>
                  <td className="py-3 px-4 font-sans font-bold text-[var(--text-primary)] whitespace-nowrap">
                    {record.targetName}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getTriggerBadge(record)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--text-secondary)] max-w-xs truncate" title={record.imageName}>
                    <span>{record.imageName}</span>
                    {record.newDigest && (
                      <span className="text-[10px] text-[var(--text-muted)] ml-1.5 font-mono">
                        ({record.newDigest.slice(0, 12)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--text-primary)]">
                    {formatDuration(record.durationMs)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[var(--text-muted)]" title={record.createdAt}>
                    {formatRelativeTime(record.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedLogRecord(record)}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--cloud-400)] hover:text-[var(--cloud-300)]"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      {t('deployments.viewLogsBtn')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log İnceleme Modalı */}
      {selectedLogRecord && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLogRecord(null)}
          title={t('deployments.logDrawerTitle', { id: selectedLogRecord.id.slice(0, 16) })}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)] text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] font-medium">Hedef:</span>
                <span className="font-bold text-[var(--text-primary)] font-sans">{selectedLogRecord.targetName}</span>
                <span className="text-[var(--text-muted)]">|</span>
                <span className="text-[var(--text-muted)] font-medium">İmaj:</span>
                <span className="font-mono text-[var(--text-secondary)]">{selectedLogRecord.imageName}</span>
              </div>
              <div>
                {getStatusBadge(selectedLogRecord)}
              </div>
            </div>

            <div className="h-[460px]">
              <DeploymentTerminalLog 
                logs={selectedLogRecord.logOutput ? selectedLogRecord.logOutput.split('\n') : []}
                heightClass="h-[460px]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 text-[11px] text-[var(--text-muted)]">
              <div>
                {selectedLogRecord.errorMessage && (
                  <span className="text-[var(--status-down)] font-semibold">
                    Hata: {selectedLogRecord.errorMessage}
                  </span>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelectedLogRecord(null)}>
                {t('deployments.closeModal')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
};
