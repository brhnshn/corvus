import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface SystemdConfirmModalProps {
  confirmModal: {
    unitName: string;
    action: 'restart' | 'stop';
  } | null;
  onClose: () => void;
  onConfirm: (unitName: string, action: 'restart' | 'stop') => void;
}

export const SystemdConfirmModal: React.FC<SystemdConfirmModalProps> = ({
  confirmModal,
  onClose,
  onConfirm
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={Boolean(confirmModal)}
      onClose={onClose}
      title={confirmModal?.action === 'restart' ? t('services.systemdRestart') : t('services.systemdStop')}
      subtitle={confirmModal?.unitName}
      icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)]">
          {confirmModal?.action === 'restart'
            ? t('services.systemdConfirmRestart', { unit: confirmModal?.unitName || '' })
            : t('services.systemdConfirmStop', { unit: confirmModal?.unitName || '' })}
        </p>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant={confirmModal?.action === 'stop' ? 'danger' : 'cloud'}
            size="sm"
            onClick={() => {
              if (confirmModal) {
                onConfirm(confirmModal.unitName, confirmModal.action);
              }
            }}
          >
            {confirmModal?.action === 'restart' ? t('services.systemdRestart') : t('services.systemdStop')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
