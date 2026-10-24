import React, { useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { api, type VersionInfo } from '../../api/client';
import { useI18n } from '../../i18n';

declare const __APP_VERSION__: string | undefined;

export const SidebarFooter: React.FC = () => {
  const { t } = useI18n();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    api.getVersion().then(setVersionInfo).catch(() => {});
  }, []);

  return (
    <div className="sidebar-footer">
      <a
        href="/status"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-link"
        title={t('nav.publicStatusPage')}
      >
        <span className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>{t('nav.liveStatus')}</span>
        </span>
        <span className="mono text-[11px] text-[var(--text-muted)]">↗</span>
      </a>

      <a
        href={versionInfo?.releaseUrl || "https://github.com/brhnshn/corvus"}
        target="_blank"
        rel="noopener noreferrer"
        className="version-row hover:bg-[var(--bg-hover)] transition-all cursor-pointer rounded-[var(--radius-sm)] py-1.5 px-2 flex items-center justify-between group no-underline"
        title={t('nav.githubAndChangelog')}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <svg className="w-3.5 h-3.5 fill-current text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span className="mono text-[11px] text-[var(--cloud-200)] group-hover:text-white truncate font-medium">Corvus {versionInfo?.currentVersion ? `v${versionInfo.currentVersion}` : (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? `v${__APP_VERSION__}` : '')}</span>
        </span>
        {versionInfo?.isUpdateAvailable ? (
          <span className="mono text-[10.5px] text-[var(--status-warn)] font-semibold shrink-0">{t('nav.updateAvailable')}</span>
        ) : (
          <span className="mono text-[10.5px] text-[var(--status-up)] flex items-center gap-1 font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-up)]" />
            {t('nav.upToDate')}
          </span>
        )}
      </a>
    </div>
  );
};
