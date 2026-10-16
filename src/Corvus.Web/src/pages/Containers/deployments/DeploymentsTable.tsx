import React, { useState } from 'react';
import { useI18n } from '../../../i18n';
import type { DeploymentRecord } from '../../../types/deployments';
import { Pill } from '../../../components/ui/Pill';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { DeploymentTerminalLog } from './DeploymentTerminalLog';
import { formatRelativeTime } from '../../../utils/format';
import { 
  GitBranch, 
  Terminal, 
  Clock, 
  Sparkles
} from 'lucide-react';

export interface DeploymentsTableProps {
  deployments: DeploymentRecord[];
  loading?: boolean;
}

export const DeploymentsTable: React.FC<DeploymentsTableProps> = ({
  deployments,
  loading = false
}) => {
  const { t } = useI18n();
  const [selectedLogRecord, setSelectedLogRecord] = useState<DeploymentRecord | null>(null);

  if (loading && deployments.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-[var(--text-muted)] opacity-70">
        {t('common.loading')}
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="py-10 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-md)] p-6 bg-[var(--bg-subtle)]">
        <GitBranch className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
        <h4 className="text-xs font-semibold text-zinc-300">{t('deployments.noDeployments')}</h4>
        <p className="text-[11.5px] text-[var(--text-muted)] max-w-sm">
          {t('deployments.noDeploymentsDesc')}
        </p>
      </div>
    );
  }

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

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'webhook_github':
        return t('deployments.triggerWebhook');
      case 'scheduled':
        return t('deployments.triggerScheduled');
      default:
        return t('deployments.triggerManual');
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-card)]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] bg-white/[0.02] text-[var(--text-muted)] font-mono text-[11px]">
              <th className="py-2.5 px-3">{t('deployments.colStatus')}</th>
              <th className="py-2.5 px-3">{t('deployments.colTarget')}</th>
              <th className="py-2.5 px-3">{t('deployments.colTrigger')}</th>
              <th className="py-2.5 px-3">{t('deployments.colImageDigest')}</th>
              <th className="py-2.5 px-3">{t('deployments.colDuration')}</th>
              <th className="py-2.5 px-3">{t('deployments.colDate')}</th>
              <th className="py-2.5 px-3 text-right">{t('deployments.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {deployments.map((d) => {
              const durationSec = d.durationMs ? (d.durationMs / 1000).toFixed(1) + 's' : '-';

              return (
                <tr key={d.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap">
                    {getStatusBadge(d)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-zinc-200 block truncate max-w-[150px]">
                      {d.targetName}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {d.targetId?.substring(0, 12)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {d.triggerType === 'webhook_github' ? (
                        <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span>{getTriggerLabel(d.triggerType)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-[var(--text-muted)]">
                    <div className="truncate max-w-[180px]" title={d.imageName}>
                      {d.imageName}
                    </div>
                    {d.newDigest && (
                      <div className="text-[10px] text-emerald-400/80 truncate max-w-[140px]" title={d.newDigest}>
                        {d.newDigest.substring(0, 19)}...
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                      <span>{durationSec}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[var(--text-muted)] whitespace-nowrap">
                    {formatRelativeTime(d.createdAt)}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    {d.logOutput && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLogRecord(d)}
                        icon={<Terminal className="w-3.5 h-3.5" />}
                      >
                        {t('deployments.viewLogsBtn')}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Log Output Viewer Modal */}
      {selectedLogRecord && (
        <Modal
          isOpen={!!selectedLogRecord}
          onClose={() => setSelectedLogRecord(null)}
          title={
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>
                {t('deployments.logDrawerTitle', { id: selectedLogRecord.id.substring(0, 8) })}
              </span>
            </div>
          }
          subtitle={
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
              <span>{selectedLogRecord.targetName}</span>
              <span>•</span>
              <span>{selectedLogRecord.imageName}</span>
            </div>
          }
          maxWidth="max-w-3xl"
        >
          <div className="flex flex-col gap-3">
            <DeploymentTerminalLog
              logs={(selectedLogRecord.logOutput || '').split('\n').filter(Boolean)}
              isStreaming={false}
              heightClass="h-[400px]"
            />
            <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLogRecord(null)}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
