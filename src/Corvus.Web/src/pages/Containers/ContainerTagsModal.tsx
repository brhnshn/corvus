import React, { useState, useEffect } from 'react';
import { X, Tag, Loader2, Check } from 'lucide-react';
import type { DockerContainer } from '../../types';
import { api } from '../../api';
import { TagInput } from '../../components/common/TagInput';
import { useI18n } from '../../i18n';

interface ContainerTagsModalProps {
  container: DockerContainer;
  onClose: () => void;
  onSuccess: (updatedTags: string[]) => void;
}

export function extractContainerTags(labels?: Record<string, string>): string[] {
  if (!labels) return [];
  const tags: string[] = [];
  if (labels['corvus.tags']) {
    tags.push(...labels['corvus.tags'].split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (labels['environment']) tags.push(labels['environment'].trim());
  else if (labels['env']) tags.push(labels['env'].trim());
  if (labels['com.docker.compose.project']) tags.push(labels['com.docker.compose.project'].trim());
  return Array.from(new Set(tags));
}

export const ContainerTagsModal: React.FC<ContainerTagsModalProps> = ({
  container,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const rawName = container.Names?.[0] || container.Id.slice(0, 12);
  const cleanName = rawName.replace(/^\//, '');
  const shortId = container.Id.slice(0, 12);

  const initialTags = React.useMemo(() => {
    if (container.tags && container.tags.length > 0) {
      return [...container.tags];
    }
    return extractContainerTags(container.Labels);
  }, [container]);

  const [tags, setTags] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compose projesi varsa önerilere ekle
  const suggestions = React.useMemo(() => {
    const list = ['Prod', 'Staging', 'Dev', 'Internal', 'Database', 'API', 'Web'];
    const composeProj = container.Labels?.['com.docker.compose.project'];
    if (composeProj && !list.includes(composeProj)) {
      list.unshift(composeProj);
    }
    return list;
  }, [container]);

  // ESC tuşuyla kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, onClose]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const success = await api.updateContainerTags(container.Id, tags);
      if (success) {
        onSuccess(tags);
        onClose();
      } else {
        setError(t('containers.tagsSaveError') || 'Etiketler kaydedilemedi.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Etiketler kaydedilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="container-tags-title"
    >
      <div className="bg-[#131620] border border-[#2a2e3f] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col scale-100 transition-all">
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2e3f] bg-[#1a1d29]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 id="container-tags-title" className="text-sm font-semibold text-[#e5e7eb]">
                {t('containers.tagsModalTitle') || 'Konteyner Etiketleri'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
                <span className="font-medium text-[#e5e7eb]">{cleanName}</span>
                <span className="font-mono text-[10px] text-[#6b7280]">({shortId})</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded-lg text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#2a2e3f]/60 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label={t('common.close') || 'Kapat'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Gövdesi */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <p className="text-xs text-[#9ca3af] leading-relaxed">
            {t('containers.tagsModalDesc') ||
              'Bu konteyner için filtreleme ve gruplamada kullanılacak özel etiketleri belirleyin.'}
          </p>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#e5e7eb]">
              {t('services.formTags') || 'Etiketler'}
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              suggestions={suggestions}
              placeholder={t('services.tagPlaceholder') || 'Etiket ekle (Prod, DB, API)...'}
              disabled={saving}
            />
          </div>

          {/* Modal Alt Butonları */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#2a2e3f]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg border border-[#2a2e3f] bg-[#1a1d29] text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#202434] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t('common.cancel') || 'İptal'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-sm shadow-indigo-500/20 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('common.saving') || 'Kaydediliyor...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('common.save') || 'Kaydet'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
