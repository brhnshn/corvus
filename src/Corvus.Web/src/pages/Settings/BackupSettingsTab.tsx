import React from 'react';
import { Database, FileCheck, RefreshCw, Download, Radio, Copy, Check } from 'lucide-react';
import { useI18n } from '../../i18n';

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
    <div className="p-4 sm:p-6 rounded-2xl surface border border-white/10 space-y-6">
      <div className="border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Database className="w-4 h-4 text-white/70" />
          <h2>{t('settings.backupSectionTitle')}</h2>
        </div>
      </div>

      {/* 1. Dahili Corvus Yedeği */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h3>{t('settings.internalBackupTitle')}</h3>
          </div>
          <p className="text-xs text-white/50 max-w-md leading-relaxed">
            {t('settings.internalBackupDesc')}
          </p>
        </div>

        <button
          type="button"
          disabled={downloadingBackup}
          onClick={onDownloadBackup}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-xs"
        >
          {downloadingBackup ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t('settings.downloadingBackup')}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-black" />
              <span>{t('settings.downloadBackupBtn')}</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Harici Script Bildirimi (Opsiyonel) */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Radio className="w-4 h-4 text-white/70" />
            <h3>{t('settings.externalBackupTitle')}</h3>
          </div>
        </div>

        <p className="text-xs text-white/50 leading-relaxed">
          {t('settings.externalBackupDesc')}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-white/60 shrink-0">{t('settings.backupTokenLabel')}:</span>
            <input
              type="text"
              value={settings['backup_push_token'] || ''}
              placeholder="örn. a8f1c390e4b1"
              onChange={(e) => setSettings({ ...settings, backup_push_token: e.target.value })}
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={onGenerateToken}
            className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
          >
            {t('settings.generateTokenBtn')}
          </button>
        </div>

        {/* Hazır Kopyalanabilir Curl Kutusu */}
        <div className="relative group mt-2">
          <pre className="p-4 rounded-xl bg-black/40 border border-white/10 font-mono text-[11px] text-white/90 overflow-x-auto whitespace-pre leading-relaxed">
            {backupCurlSnippet}
          </pre>
          <button
            type="button"
            onClick={onCopyBackupCmd}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all cursor-pointer"
            title={copiedBackupCmd ? t('settings.copiedTooltip') : t('settings.copyCommandTooltip')}
          >
            {copiedBackupCmd ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
