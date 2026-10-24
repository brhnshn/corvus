import React from 'react';
import { Save, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import type { VersionInfo } from '../../api/client';
import type { SettingsTab } from './SettingsTabNav';

export interface SettingsHeaderProps {
  versionInfo: VersionInfo | null;
  activeTab: SettingsTab;
  saved: boolean;
  saving: boolean;
  isViewer: boolean;
  onSave: () => void;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({
  versionInfo,
  activeTab,
  saved,
  saving,
  isViewer,
  onSave
}) => {
  const { t } = useI18n();

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {t('settings.title')}
          </h1>
          {versionInfo && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-semibold">
                v{versionInfo.currentVersion}
              </span>
              {versionInfo.isUpdateAvailable ? (
                <a
                  href={versionInfo.releaseUrl || 'https://github.com/brhnshn/corvus/releases'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded bg-[var(--status-up-bg)] border border-[var(--status-up)]/30 text-[var(--status-up)] hover:brightness-110 transition-colors font-medium cursor-pointer"
                  title={t('settings.versionUpdateAvailable', { version: `v${versionInfo.latestVersion}` })}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-up)]" />
                  <span>v{versionInfo.latestVersion}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                  <Check className="w-3 h-3 text-[var(--status-up)]" />
                  <span>{t('settings.versionUpToDate')}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {activeTab !== 'users' && activeTab !== 'alerts' && (
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--status-up)] font-medium bg-[var(--status-up-bg)] border border-[var(--status-up)]/30 px-3 py-1.5 rounded-[var(--radius-sm)]">
              <Check className="w-3.5 h-3.5" />
              {t('settings.savedToast')}
            </span>
          )}
          <Button
            variant="primary"
            onClick={onSave}
            disabled={saving || isViewer}
            title={isViewer ? t('settings.viewerRestricted') : undefined}
            icon={saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {saving ? t('common.saving') : t('settings.saveBtn')}
          </Button>
        </div>
      )}
    </>
  );
};
