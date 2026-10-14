import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../api';
import type { SystemSummaryDto } from '../../types';
import { useI18n } from '../../i18n';

interface DeleteSystemModalProps {
  system: SystemSummaryDto | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteSystemModal: React.FC<DeleteSystemModalProps> = ({
  system,
  isOpen,
  onClose,
  onDeleted
}) => {
  const { t } = useI18n();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!system) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteSystem(system.id);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('systems.deleteModal.errorGeneric'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('systems.deleteModal.title')}
      subtitle={system.name}
      icon={
        <div className="p-2 rounded-[var(--radius-md)] bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Trash2 className="w-4 h-4" />
        </div>
      }
      maxWidth="max-w-md"
    >
      <div className="space-y-4 pt-1">
        {error && (
          <div className="p-3 rounded-[var(--radius-md)] bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {t('systems.deleteModal.desc', { name: system.name })}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
            type="button"
          >
            {t('systems.deleteModal.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            type="button"
          >
            {isDeleting ? t('systems.deleteModal.deleting') : t('systems.deleteModal.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
