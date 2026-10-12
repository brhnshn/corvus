import React, { useState, useEffect } from 'react';
import { Pencil, X, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
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
  const [name, setName] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (system) {
      setName(system.name);
      setTagsStr(system.tags ? system.tags.join(', ') : '');
      setError(null);
    }
  }, [system]);

  if (!isOpen || !system) return null;

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
      setError(err instanceof Error ? err.message : 'Sistem güncellenemedi.');
    } finally {
      setIsSaving(false);
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
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#eceef6]">
                {t('systems.editModal.title')}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#eceef6] mb-1.5">
              {t('systems.editModal.nameLabel')}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#eceef6] mb-1.5">
              {t('systems.editModal.tagsLabel')}
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="örn. production, vps, edge"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none focus:border-white/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3">
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
              type="submit"
            >
              {isSaving ? t('systems.editModal.saving') : t('systems.editModal.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
