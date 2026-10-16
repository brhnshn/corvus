import React from 'react';
import { Terminal, Copy, Check, RefreshCw } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface SystemdLogsModalProps {
  unitName: string | null;
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  loadingLogs: boolean;
  logLines: number;
  logsCopied: boolean;
  onReloadLogs: (lines: number) => void;
  onCopyLogs: () => void;
}

export const SystemdLogsModal: React.FC<SystemdLogsModalProps> = ({
  unitName,
  isOpen,
  onClose,
  logs,
  loadingLogs,
  logLines,
  logsCopied,
  onReloadLogs,
  onCopyLogs
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('services.systemdLogsTitle', { unit: unitName || '' })}
      subtitle={t('services.systemdLogsSubtitle')}
      icon={<Terminal className="w-5 h-5 text-[var(--cloud-200)]" />}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-3">
        {/* Ust Toolbar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              {t('services.systemdLines')}:
            </span>
            {[50, 100, 250, 500].map((lines) => (
              <button
                key={lines}
                type="button"
                onClick={() => onReloadLogs(lines)}
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
            onClick={onCopyLogs}
            icon={logsCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {logsCopied ? t('services.systemdLogsCopied') : t('services.systemdCopyLogs')}
          </Button>
        </div>

        {/* Log Ciktisi Kutusu */}
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
  );
};
