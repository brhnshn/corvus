import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api, type DockerContainer } from '../../../api/client';
import { useToast } from '../../../components/ui/ToastContext';
import { useI18n } from '../../../i18n';

export interface UseContainerActionsProps {
  setContainers: Dispatch<SetStateAction<DockerContainer[]>>;
  loadContainers: (isManual?: boolean) => Promise<void>;
  editingTagsContainer: DockerContainer | null;
}

export function useContainerActions({
  setContainers,
  loadContainers,
  editingTagsContainer,
}: UseContainerActionsProps) {
  const toast = useToast();
  const { t } = useI18n();

  const [actionInProgress, setActionInProgress] = useState<{ id: string; action: string } | null>(null);
  const [deletingContainer, setDeletingContainer] = useState<DockerContainer | null>(null);
  const [deleteForce, setDeleteForce] = useState(false);
  const [deleteVolumes, setDeleteVolumes] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAction = async (
    action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart',
    id: string,
    name: string
  ) => {
    const actionLabels: Record<string, string> = {
      start: t('containers.actionInProgressStart'),
      stop: t('containers.actionInProgressStop'),
      pause: t('containers.actionInProgressPause'),
      unpause: t('containers.actionInProgressUnpause'),
      restart: t('containers.actionInProgressRestart'),
    };

    setActionInProgress({ id, action });
    toast.info(`"${name}" ${actionLabels[action]}…`);

    try {
      if (action === 'start') await api.startContainer(id);
      else if (action === 'stop') await api.stopContainer(id);
      else if (action === 'pause') await api.pauseContainer(id);
      else if (action === 'unpause') await api.unpauseContainer(id);
      else if (action === 'restart') await api.restartContainer(id);

      setContainers((prev) =>
        prev.map((c) => {
          if (c.Id === id) {
            let newState = c.State;
            let newStatus = c.Status;
            if (action === 'start') {
              newState = 'running';
              newStatus = 'Up (just now)';
            } else if (action === 'stop') {
              newState = 'exited';
              newStatus = 'Exited (just now)';
            } else if (action === 'pause') {
              newState = 'paused';
              newStatus = 'Paused';
            } else if (action === 'unpause') {
              newState = 'running';
              newStatus = 'Up';
            }
            return { ...c, State: newState, Status: newStatus };
          }
          return c;
        })
      );

      toast.success(t('containers.actionCompletedToast', { name }));
      await loadContainers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('containers.actionFailedToast'));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingContainer) return;
    const rawName = deletingContainer.Names?.[0] || deletingContainer.Id.slice(0, 12);
    const cleanName = rawName.replace(/^\//, '');
    const isRunning = (deletingContainer.State || '').toLowerCase() === 'running';

    setIsDeleting(true);
    try {
      await api.deleteContainer(deletingContainer.Id, isRunning ? true : deleteForce, deleteVolumes);
      setContainers((prev) => prev.filter((c) => c.Id !== deletingContainer.Id));
      toast.success(t('containers.deleteSuccess', { name: cleanName }));
      setDeletingContainer(null);
      setDeleteForce(false);
      setDeleteVolumes(false);
      await loadContainers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('containers.deleteError', { name: cleanName }));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTagsUpdated = (updatedTags: string[]) => {
    if (!editingTagsContainer) return;
    const containerId = editingTagsContainer.Id;
    setContainers((prev) =>
      prev.map((c) => (c.Id === containerId ? { ...c, tags: updatedTags } : c))
    );
    toast.success(t('containers.tagsUpdatedToast'));
  };

  return {
    actionInProgress,
    setActionInProgress,
    deletingContainer,
    setDeletingContainer,
    deleteForce,
    setDeleteForce,
    deleteVolumes,
    setDeleteVolumes,
    isDeleting,
    handleAction,
    handleConfirmDelete,
    handleTagsUpdated,
  };
}
