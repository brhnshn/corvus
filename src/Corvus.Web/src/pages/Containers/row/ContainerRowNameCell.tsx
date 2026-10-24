import React from 'react';
import { Sparkles } from 'lucide-react';
import { Pill, type StatusType } from '../../../components/ui/Pill';
import { TagChip } from '../../../components/ui/TagChip';
import { ContainerQuickActions } from '../ContainerQuickActions';
import { useI18n } from '../../../i18n';
import type { DockerContainer } from '../../../types';

export interface ContainerRowNameCellProps {
  container: DockerContainer;
  cleanName: string;
  shortId: string;
  isRunning: boolean;
  isPaused: boolean;
  composeProject?: string;
  hasUpdate?: boolean;
  onOpenImageUpdate?: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer, defaultTab?: string) => void;
  isAdmin?: boolean;
  containerTags: string[];
  onSelectTag?: (tag: string) => void;
  statusType: StatusType;
  statusLabel: string;
}

export const ContainerRowNameCell: React.FC<ContainerRowNameCellProps> = ({
  container,
  cleanName,
  shortId,
  isRunning,
  isPaused,
  composeProject,
  hasUpdate,
  onOpenImageUpdate,
  onInspect,
  isAdmin,
  containerTags,
  onSelectTag,
  statusType,
  statusLabel,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <span
        className={`
          w-2 h-2 rounded-full mt-1.5 shrink-0
          ${isRunning ? 'bg-[var(--status-up)]' : isPaused ? 'bg-[var(--status-warn)]' : 'bg-[var(--status-down)]'}
        `}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <b
            className="text-[13.5px] font-mono font-semibold text-[var(--cloud-100)] hover:text-white truncate leading-snug"
            title={cleanName}
          >
            {cleanName}
          </b>

          {composeProject && (
            <span className="badge mono text-[10px]">
              {composeProject}
            </span>
          )}

          {hasUpdate && onOpenImageUpdate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenImageUpdate(container);
              }}
              title={t('containers.imageUpdateAvailable')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-medium font-sans bg-[var(--status-warn-bg)] text-[var(--status-warn)] border border-[var(--status-warn)]/30 hover:brightness-110 transition-colors cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>{t('containers.imageUpdateAvailable')}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <small className="font-mono text-[11px] text-[#9ba0b5] block truncate">
            {shortId}
          </small>

          {/* Satır içi Hızlı Konteyner Eylemleri (Inline Quick Actions) */}
          <div className="hidden sm:inline-block">
            <ContainerQuickActions
              container={container}
              onInspect={onInspect}
              isAdmin={isAdmin}
            />
          </div>
        </div>

        {containerTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {containerTags.map((tag) => (
              <TagChip
                key={tag}
                name={tag}
                onClick={onSelectTag ? () => onSelectTag(tag) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobilde sağ üstte Pill */}
      <div className="lg:hidden shrink-0">
        <Pill status={statusType} label={statusLabel} />
      </div>
    </div>
  );
};
