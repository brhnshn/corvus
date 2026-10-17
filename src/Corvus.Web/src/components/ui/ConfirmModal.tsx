import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useI18n } from '../../i18n';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
  icon,
  children,
}) => {
  const { t } = useI18n();

  const defaultIcon =
    variant === 'danger' ? (
      <Trash2 className="w-5 h-5 text-[var(--status-down)]" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-[var(--status-warn)]" />
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      icon={icon ?? defaultIcon}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {description && (
          <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {description}
          </div>
        )}

        {children && <div className="space-y-2.5">{children}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={variant}
            size="sm"
            onClick={onConfirm}
            isLoading={loading}
            disabled={loading}
          >
            {confirmLabel || t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
