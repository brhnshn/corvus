import React from 'react';
import { Play, Square, RotateCw, MoreHorizontal, Rocket, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useI18n } from '../../../i18n';
import type { DockerContainer } from '../../../types';

export interface ContainerRowActionsProps {
  container: DockerContainer;
  cleanName: string;
  isRunning: boolean;
  actionInProgress?: boolean;
  isAdmin?: boolean;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onDeploy?: (container: DockerContainer) => void;
  onDelete?: (container: DockerContainer) => void;
  onOpenSheet: (container: DockerContainer) => void;
}

export const ContainerRowActions: React.FC<ContainerRowActionsProps> = ({
  container,
  cleanName,
  isRunning,
  actionInProgress = false,
  isAdmin = true,
  onAction,
  onDeploy,
  onDelete,
  onOpenSheet,
}) => {
  const { t } = useI18n();

  return (
    <div
      className="flex items-center justify-end gap-1.5 border-t border-[var(--border-subtle)] pt-2 lg:border-t-0 lg:pt-0"
      onClick={(e) => e.stopPropagation()}
    >
      {isAdmin && (
        <>
          {isRunning ? (
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                onAction('stop', container.Id, cleanName);
              }}
              disabled={actionInProgress}
              icon={<Square className="w-3.5 h-3.5" />}
              className="flex-1 lg:flex-none"
            >
              {t('containers.stop')}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                onAction('start', container.Id, cleanName);
              }}
              disabled={actionInProgress}
              icon={<Play className="w-3.5 h-3.5" />}
              className="flex-1 lg:flex-none"
            >
              {t('containers.start')}
            </Button>
          )}

          <Button
            variant="icon"
            size="sm"
            onClick={(e) => {
              e?.stopPropagation();
              onAction('restart', container.Id, cleanName);
            }}
            disabled={actionInProgress}
            icon={<RotateCw className="w-3.5 h-3.5" />}
            title={t('containers.restart')}
            aria-label={t('containers.restart')}
          />

          {onDeploy && (
            <Button
              variant="icon"
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                onDeploy(container);
              }}
              disabled={actionInProgress}
              icon={<Rocket className="w-3.5 h-3.5 text-indigo-400" />}
              title={t('containers.deployTooltip')}
              aria-label={t('containers.deploy')}
            />
          )}

          {onDelete && (
            <Button
              variant="icon"
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                onDelete(container);
              }}
              disabled={actionInProgress}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
              title={t('containers.delete')}
              aria-label={t('containers.delete')}
            />
          )}
        </>
      )}

      <Button
        variant="icon"
        size="sm"
        onClick={(e) => {
          e?.stopPropagation();
          onOpenSheet(container);
        }}
        icon={<MoreHorizontal className="w-4 h-4" />}
        title={t('common.actions')}
        aria-label={t('common.actions')}
      />
    </div>
  );
};
