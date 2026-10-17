import React from 'react';
import { ArrowLeft, Play, Pause, Square, RotateCw, Loader2, Sparkles, Trash2, Sliders } from 'lucide-react';
import { useI18n } from '../../i18n';

import type { DockerContainer } from '../../types';
import type { ContainerDetailTab } from './types';

interface ContainerDetailHeaderProps {
  container: DockerContainer | null;
  containerId: string;
  onBack: () => void;
  actionInProgress: string | null;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart') => void;
  onDelete?: () => void;
  activeTab: ContainerDetailTab;
  onSelectTab: (tab: ContainerDetailTab) => void;
  isAdmin?: boolean;
  onOpenUpdateModal?: () => void;
  onOpenResourceLimitsModal?: () => void;
}

export const ContainerDetailHeader: React.FC<ContainerDetailHeaderProps> = ({
  container,
  containerId,
  onBack,
  onAction,
  onDelete,
  actionInProgress,
  isAdmin = false,
  onOpenUpdateModal,
  onOpenResourceLimitsModal,
}) => {
  const { t } = useI18n();

  const name = container?.Names?.[0]?.replace(/^\//, '') || containerId.slice(0, 12);
  const image = container?.Image || '';
  const status = container?.Status || '';
  const state = container?.State || '';

  const isRunning = state?.toLowerCase() === 'running';
  const isPaused = state?.toLowerCase() === 'paused';

  return (
    <div className="space-y-4">
      {/* Üst Gezinme / Geri Dön */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('containers.backToContainers')}</span>
        </button>
      </div>

      {/* Ana Başlık ve Aksiyon Barı */}
      <div className="card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 animate-rv">
        {/* Sol Taraf: İsim, Durum, İmaj & ID */}
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                isRunning ? 'bg-[var(--status-up)]' : isPaused ? 'bg-[var(--status-warn)]' : 'bg-[var(--status-down)]'
              }`}
            />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] truncate">
              {name}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-[var(--radius-sm)] font-semibold uppercase tracking-wider ${
                isRunning
                  ? 'bg-[var(--status-up-bg)] text-[var(--status-up)] border border-[var(--status-up)]/30'
                  : isPaused
                  ? 'bg-[var(--status-warn-bg)] text-[var(--status-warn)] border border-[var(--status-warn)]/30'
                  : 'bg-[var(--status-down-bg)] text-[var(--status-down)] border border-[var(--status-down)]/30'
              }`}
            >
              {isRunning
                ? t('containers.stateRunning')
                : isPaused
                ? t('containers.statePaused')
                : t('containers.stateStopped')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] font-mono">
            <span className="truncate max-w-[320px] text-[var(--text-primary)]" title={image}>
              {image}
            </span>
            <span className="text-[var(--text-muted)]">•</span>
            <span>ID: {containerId.slice(0, 12)}</span>
            {status && (
              <>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--text-secondary)]">{status}</span>
              </>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Yaşam Döngüsü Butonları */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          {onOpenUpdateModal && (
            <button
              type="button"
              onClick={onOpenUpdateModal}
              title={t('containers.checkUpdate')}
              className="btn btn-sm btn-ghost inline-flex items-center gap-1.5 text-[var(--status-up)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('containers.checkUpdate')}</span>
            </button>
          )}

          {isAdmin && onOpenResourceLimitsModal && (
            <button
              type="button"
              onClick={onOpenResourceLimitsModal}
              title={t('containers.editResourceLimits')}
              className="btn btn-sm btn-ghost inline-flex items-center gap-1.5 text-sky-400"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('containers.editResourceLimitsBtn')}</span>
            </button>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--border-hairline)] ml-1">
              {isRunning && (
                <>
                  <button
                    type="button"
                    disabled={!!actionInProgress}
                    onClick={() => onAction('restart')}
                    title={t('containers.restart')}
                    className="btn btn-sm btn-ghost p-2 disabled:opacity-50"
                  >
                    {actionInProgress === 'restart' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--cloud-200)]" />
                    ) : (
                      <RotateCw className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!!actionInProgress}
                    onClick={() => onAction('pause')}
                    title={t('containers.pause')}
                    className="btn btn-sm btn-ghost p-2 text-[var(--status-warn)] disabled:opacity-50"
                  >
                    {actionInProgress === 'pause' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!!actionInProgress}
                    onClick={() => onAction('stop')}
                    title={t('containers.stop')}
                    className="btn btn-sm inline-flex items-center gap-1.5 text-[var(--status-down)] hover:bg-[var(--status-down-bg)] disabled:opacity-50"
                  >
                    {actionInProgress === 'stop' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>{t('containers.stop')}</span>
                  </button>
                </>
              )}

              {isPaused && (
                <button
                  type="button"
                  disabled={!!actionInProgress}
                  onClick={() => onAction('unpause')}
                  className="btn btn-sm inline-flex items-center gap-1.5 text-[var(--status-warn)] hover:bg-[var(--status-warn-bg)] disabled:opacity-50"
                >
                  {actionInProgress === 'unpause' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>{t('containers.resume')}</span>
                </button>
              )}

              {!isRunning && !isPaused && (
                <button
                  type="button"
                  disabled={!!actionInProgress}
                  onClick={() => onAction('start')}
                  className="btn btn-sm inline-flex items-center gap-1.5 text-[var(--status-up)] hover:bg-[var(--status-up-bg)] disabled:opacity-50"
                >
                  {actionInProgress === 'start' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>{t('containers.start')}</span>
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  disabled={!!actionInProgress}
                  onClick={onDelete}
                  title={t('containers.delete')}
                  aria-label={t('containers.delete')}
                  className="btn btn-sm btn-ghost p-2 text-[var(--status-down)] hover:bg-[var(--status-down-bg)] disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
