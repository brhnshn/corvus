import React, { useState } from 'react';
import { Pencil, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../api';
import type { SystemSummaryDto } from '../../types';
import { useI18n } from '../../i18n';

interface EditSystemModalProps {
  system: SystemSummaryDto | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditSystemModal: React.FC<EditSystemModalProps> = ({
  system,
  isOpen,
  onClose,
  onUpdated
}) => {
  const { t } = useI18n();
  const [name, setName] = useState(system?.name || '');
  const [tagsStr, setTagsStr] = useState(system?.tags ? system.tags.join(', ') : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevSystemId, setPrevSystemId] = useState(system?.id);

  if (system && system.id !== prevSystemId) {
    setPrevSystemId(system.id);
    setName(system.name);
    setTagsStr(system.tags ? system.tags.join(', ') : '');
    setError(null);
  }

  if (!system) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);

    const tags = tagsStr
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    try {
      await api.updateSystem(system.id, {
        name: name.trim(),
        tags
      });
      onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('systems.editModal.errorGeneric'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('systems.editModal.title')}
      subtitle={system.name}
      icon={
        <div className="p-2 rounded-[var(--radius-md)] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Pencil className="w-4 h-4" />
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t('systems.editModal.nameLabel')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t('systems.editModal.tagsLabel')}
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder={t('systems.addSheet.tagsPlaceholder')}
              className="input w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
              type="button"
            >
              {t('systems.editModal.cancel')}
            </Button>
            <Button
              variant="primary"
              disabled={isSaving || !name.trim()}
              isLoading={isSaving}
              type="submit"
            >
              {isSaving ? t('systems.editModal.saving') : t('systems.editModal.save')}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
