import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import type { DeploymentRecord } from '../../types/deployments';
import { Pill } from '../../components/ui/Pill';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DeploymentTerminalLog } from '../Containers/deployments/DeploymentTerminalLog';
import { formatRelativeTime } from '../../utils/format';
import { 
  GitBranch, 
  Terminal, 
  Clock, 
  Search, 
  Layers
} from 'lucide-react';

interface DeploymentsHistoryTableProps {
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm backdrop-blur-sm">
      {/* Tablo Üst Başlık & Filtreler */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-100">
            {t('deployments.historyTitle')}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            ({deployments.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Arama */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('deployments.searchPlaceholder')}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Durum Filtreleri */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('deployments.filterAll')}
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'success'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('deployments.filterSuccess')}
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'failed'
                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('deployments.filterFailed')}
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('deployments.filterPending')}
            </button>
          </div>
        </div>
      </div>

      {/* Tablo İçeriği */}
      {loading && deployments.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400">
          {t('common.loading')}
        </div>
      ) : deployments.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-2 p-6">
          <GitBranch className="w-10 h-10 text-slate-600 mb-1" />
          <h4 className="text-sm font-semibold text-slate-300">
            {t('deployments.noDeployments')}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm">
            {t('deployments.noDeploymentsDesc')}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/30 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t('deployments.colStatus')}</th>
                <th className="py-3 px-4">{t('deployments.colTarget')}</th>
                <th className="py-3 px-4">{t('deployments.colTrigger')}</th>
                <th className="py-3 px-4">{t('deployments.colImageDigest')}</th>
                <th className="py-3 px-4">{t('deployments.colDuration')}</th>
                <th className="py-3 px-4">{t('deployments.colDate')}</th>
                <th className="py-3 px-4 text-right">{t('deployments.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {deployments.map((record) => (
                <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(record)}
                  </td>
                  <td className="py-3 px-4 font-sans font-bold text-slate-200 whitespace-nowrap">
                    {record.targetName}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getTriggerBadge(record)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400 max-w-xs truncate" title={record.imageName}>
                    <span>{record.imageName}</span>
                    {record.newDigest && (
                      <span className="text-[10px] text-slate-500 ml-1.5 font-mono">
                        ({record.newDigest.slice(0, 12)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                    {formatDuration(record.durationMs)}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-400" title={record.createdAt}>
                    {formatRelativeTime(record.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedLogRecord(record)}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
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
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">Hedef:</span>
                <span className="font-bold text-slate-200 font-sans">{selectedLogRecord.targetName}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 font-medium">İmaj:</span>
                <span className="font-mono text-slate-300">{selectedLogRecord.imageName}</span>
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

            <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
              <div>
                {selectedLogRecord.errorMessage && (
                  <span className="text-rose-400 font-semibold">
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
    </div>
  );
};
