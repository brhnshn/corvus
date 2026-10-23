import React from 'react';
import {
  X,
  FileCode2,
  ShieldCheck,
  FolderOpen,
  FileText
} from 'lucide-react';
import type { ComposeFileDto } from '../../../types';
import { useI18n } from '../../../i18n';
import type { EditorTab } from '../useComposeConfig';

interface ComposeModalHeaderProps {
  projectName: string;
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  composeData: ComposeFileDto | null;
  hasTabWarning: boolean;
  isBusy: boolean;
  onClose: () => void;
}

export const ComposeModalHeader: React.FC<ComposeModalHeaderProps> = ({
  projectName,
  activeTab,
  onTabChange,
  composeData,
  hasTabWarning,
  isBusy,
  onClose
}) => {
  const { t } = useI18n();

  const tabClass = (tab: EditorTab) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] font-medium transition-all text-xs cursor-pointer ${
      activeTab === tab
        ? 'bg-[var(--cloud-100)] text-[var(--bg-canvas)] font-semibold shadow-xs'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
    }`;

  return (
    <>
      {/* Modal Üst Başlık & Sekmeler */}
      <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-subtle)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] text-[var(--cloud-200)] border border-[var(--border-hairline)]">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                {t('containers.composeYamlEditor')}
              </h3>
              <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border-hairline)] text-xs font-mono font-semibold text-[var(--cloud-200)]">
                {projectName}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {t('containers.composeYamlSubtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          disabled={isBusy}
          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dosya Bilgisi & Sekme Seçici */}
      <div className="px-5 py-2.5 bg-[var(--bg-canvas)] border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Sekmeler (YAML vs .env) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onTabChange('yaml')}
            className={tabClass('yaml')}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{t('containers.composeTabYaml')}</span>
            {hasTabWarning && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warn)]" title={t('containers.composeYamlTabWarning')} />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('env')}
            className={tabClass('env')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('containers.composeTabEnv')}</span>
            {composeData?.envExists && (
              <span className="text-[10px] font-mono opacity-80">(.env)</span>
            )}
          </button>
        </div>

        {/* Dosya Yolu & Yedekleme Bildirimi */}
        <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)] font-mono">
          <div className="flex items-center gap-1.5 truncate max-w-xs sm:max-w-md" title={composeData?.filePath || ''}>
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-[var(--cloud-300)]" />
            <span className="truncate">
              {activeTab === 'yaml'
                ? (composeData?.filePath || `${projectName}/compose.yaml`)
                : (composeData?.envFilePath || `${projectName}/.env`)}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[var(--status-up)] font-sans">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('containers.composeBackupNotice')}</span>
          </div>
        </div>
      </div>
    </>
  );
};
