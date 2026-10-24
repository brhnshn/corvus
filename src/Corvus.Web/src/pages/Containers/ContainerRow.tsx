import React from 'react';
import type { DockerContainer, ContainerStats } from '../../types';
import { Pill, type StatusType } from '../../components/ui/Pill';
import { useI18n } from '../../i18n';
import { extractContainerTags } from './utils/containerTags';
import { ContainerRowNameCell } from './row/ContainerRowNameCell';
import { ContainerRowResources } from './row/ContainerRowResources';
import { ContainerRowImagePorts } from './row/ContainerRowImagePorts';
import { ContainerRowActions } from './row/ContainerRowActions';

export interface ContainerRowProps {
  container: DockerContainer;
  stats?: ContainerStats;
  actionInProgress?: boolean;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onOpenSheet: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer, defaultTab?: string) => void;
  onSelectTag?: (tag: string) => void;
  isAdmin?: boolean;
  onOpenImageUpdate?: (container: DockerContainer) => void;
  onDeploy?: (container: DockerContainer) => void;
  onDelete?: (container: DockerContainer) => void;
  hasUpdate?: boolean;
}

export const ContainerRow: React.FC<ContainerRowProps> = ({
  container,
  stats,
  actionInProgress = false,
  onAction,
  onOpenSheet,
  onInspect,
  onSelectTag,
  isAdmin = true,
  onOpenImageUpdate,
  onDeploy,
  onDelete,
  hasUpdate = false,
}) => {
  const { t } = useI18n();
  const rawName = container.Names?.[0] || container.Id || 'unknown';
  const cleanName = (rawName || '').replace(/^\//, '');
  const shortId = (container.Id || 'unknown').slice(0, 12);
  const composeProject = container.Labels?.['com.docker.compose.project'];

  const state = (container.State || 'unknown').toLowerCase();
  const isRunning = state === 'running';
  const isPaused = state === 'paused';

  const statusType: StatusType = isRunning ? 'ok' : isPaused ? 'warn' : 'err';
  const statusLabel = isRunning ? t('containers.stateRunning') : isPaused ? t('containers.statePaused') : t('containers.stateStopped');

  const containerTags = container.tags && container.tags.length > 0
    ? container.tags
    : extractContainerTags(container.Labels || {});

  const handleRowClick = () => {
    onInspect?.(container);
  };

  return (
    <div
      onClick={handleRowClick}
      className="
        bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] p-3.5 select-none
        cursor-pointer hover:border-[var(--cloud-400)] transition-all duration-150
        flex flex-col gap-3
        lg:grid lg:grid-cols-[2.1fr_1.5fr_1.8fr_1fr_210px] lg:items-center lg:gap-4 lg:py-2.5 lg:px-4
      "
    >
      {/* 1. İsim & ID & Hızlı Eylemler & Etiketler */}
      <ContainerRowNameCell
        container={container}
        cleanName={cleanName}
        shortId={shortId}
        isRunning={isRunning}
        isPaused={isPaused}
        composeProject={composeProject}
        hasUpdate={hasUpdate}
        onOpenImageUpdate={onOpenImageUpdate}
        onInspect={onInspect}
        isAdmin={isAdmin}
        containerTags={containerTags}
        onSelectTag={onSelectTag}
        statusType={statusType}
        statusLabel={statusLabel}
      />

      {/* 2. Kaynak Kullanımı (CPU & RAM çubukları) */}
      <ContainerRowResources isRunning={isRunning} stats={stats} />

      {/* 3. İmaj & Portlar */}
      <ContainerRowImagePorts container={container} onOpenImageUpdate={onOpenImageUpdate} />

      {/* 4. Durum (Masaüstü) */}
      <div className="hidden lg:block min-w-0">
        <Pill status={statusType} label={statusLabel} />
        <small className="font-mono text-[11px] text-[var(--text-muted)] block truncate mt-1">
          {container.Status || t('common.unknown')}
        </small>
      </div>

      {/* 5. Aksiyon Butonları */}
      <ContainerRowActions
        container={container}
        cleanName={cleanName}
        isRunning={isRunning}
        actionInProgress={actionInProgress}
        isAdmin={isAdmin}
        onAction={onAction}
        onDeploy={onDeploy}
        onDelete={onDelete}
        onOpenSheet={onOpenSheet}
      />
    </div>
  );
};
