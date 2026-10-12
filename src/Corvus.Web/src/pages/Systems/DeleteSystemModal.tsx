import React, { useState } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
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

  if (!isOpen || !system) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteSystem(system.id);
      onDeleted();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sistem silinemedi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-3xl bg-[#1b1d2a] border border-white/10 shadow-2xl p-6 space-y-5 animate-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#eceef6]">
                {t('systems.deleteModal.title')}
              </h3>
              <p className="text-xs text-[#9ba0b5]">
                {system.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[#9ba0b5] leading-relaxed">
          {t('systems.deleteModal.desc', { name: system.name })}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            {t('systems.deleteModal.cancel')}
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? t('systems.deleteModal.deleting') : t('systems.deleteModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
