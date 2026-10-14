import React from 'react';
import { Database, FileCheck, RefreshCw, Download, Radio, Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';

interface BackupSettingsTabProps {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  downloadingBackup: boolean;
  onDownloadBackup: () => void;
  onGenerateToken: () => void;
  backupCurlSnippet: string;
  copiedBackupCmd: boolean;
  onCopyBackupCmd: () => void;
}

export const BackupSettingsTab: React.FC<BackupSettingsTabProps> = ({
  settings,
  setSettings,
  downloadingBackup,
  onDownloadBackup,
  onGenerateToken,
  backupCurlSnippet,
  copiedBackupCmd,
  onCopyBackupCmd
}) => {
  const { t } = useI18n();

  return (
    <div className="card space-y-6">
      <div className="border-b border-[var(--border-hairline)] pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Database className="w-4 h-4 text-[var(--text-secondary)]" />
          <h2>{t('settings.backupSectionTitle')}</h2>
        </div>
      </div>

      {/* 1. Dahili Corvus Yedeği */}
      <div className="card bg-[var(--bg-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <FileCheck className="w-4 h-4 text-[var(--status-up)]" />
            <h3>{t('settings.internalBackupTitle')}</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] max-w-md leading-relaxed">
            {t('settings.internalBackupDesc')}
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          disabled={downloadingBackup}
          onClick={onDownloadBackup}
          icon={downloadingBackup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        >
          {downloadingBackup ? (t('settings.downloadingBackup') || 'İndiriliyor...') : (t('settings.downloadBackupBtn') || 'Yedeği İndir')}
        </Button>
      </div>

      {/* 2. Harici Script Bildirimi (Opsiyonel) */}
      <div className="card bg-[var(--bg-subtle)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <Radio className="w-4 h-4 text-[var(--text-secondary)]" />
            <h3>{t('settings.externalBackupTitle')}</h3>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {t('settings.externalBackupDesc')}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)] shrink-0">{t('settings.backupTokenLabel')}:</span>
            <input
              type="text"
              value={settings['backup_push_token'] || ''}
              placeholder="örn. a8f1c390e4b1"
              onChange={(e) => setSettings({ ...settings, backup_push_token: e.target.value })}
              className="input flex-1 font-mono text-xs"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onGenerateToken}
          >
            {t('settings.generateTokenBtn')}
          </Button>
        </div>

        {/* Hazır Kopyalanabilir Curl Kutusu */}
        <div className="relative group mt-2">
          <pre className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-[11px] text-[var(--cloud-200)] overflow-x-auto whitespace-pre leading-relaxed">
            {backupCurlSnippet}
          </pre>
          <button
            type="button"
            onClick={onCopyBackupCmd}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            title={copiedBackupCmd ? t('settings.copiedTooltip') : t('settings.copyCommandTooltip')}
          >
            {copiedBackupCmd ? (
              <Check className="w-3.5 h-3.5 text-[var(--status-up)]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
