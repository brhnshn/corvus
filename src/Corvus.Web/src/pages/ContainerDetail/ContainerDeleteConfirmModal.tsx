import React from 'react';
import { useI18n } from '../../i18n';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface ContainerDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  containerName: string;
  isRunning: boolean;
  deleting: boolean;
  deleteForce: boolean;
  onDeleteForceChange: (value: boolean) => void;
  deleteVolumes: boolean;
  onDeleteVolumesChange: (value: boolean) => void;
}

export const ContainerDeleteConfirmModal: React.FC<ContainerDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  containerName,
  isRunning,
  deleting,
  deleteForce,
  onDeleteForceChange,
  deleteVolumes,
  onDeleteVolumesChange
}) => {
  const { t } = useI18n();

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={t('containers.deleteTitle')}
      description={t('containers.deleteConfirm', { name: containerName })}
      confirmLabel={deleting ? t('containers.deleting') : t('containers.delete')}
      cancelLabel={t('common.cancel')}
      variant="danger"
      loading={deleting}
    >
      <div className="space-y-2 pt-1 text-xs">
        {isRunning && (
          <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--status-warn-bg)] border border-[var(--status-warn)]/30 text-[var(--status-warn)]">
            {t('containers.deleteRunningWarning')}
          </div>
        )}
        <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={deleteForce}
            onChange={(e) => onDeleteForceChange(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
          />
          <span>{t('containers.deleteForceLabel')}</span>
        </label>
        <label className="flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={deleteVolumes}
            onChange={(e) => onDeleteVolumesChange(e.target.checked)}
            className="rounded border-white/20 bg-white/5 text-rose-500 focus:ring-0 cursor-pointer"
          />
          <span>{t('containers.deleteVolumesLabel')}</span>
        </label>
      </div>
    </ConfirmModal>
  );
};
