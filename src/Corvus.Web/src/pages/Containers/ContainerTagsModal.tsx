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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="container-tags-title"
    >
      <div className="sheet-glass border border-white/10 rounded-[28px] shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] w-full max-w-md overflow-hidden flex flex-col scale-100 transition-all">
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#d5d5dc]">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 id="container-tags-title" className="text-sm font-bold text-[#eceef6]">
                {t('containers.tagsModalTitle') || 'Konteyner Etiketleri'}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[#9ba0b5] mt-0.5">
                <span className="font-semibold text-[#eceef6]">{cleanName}</span>
                <span className="font-mono text-[11px] text-[#9ba0b5]">({shortId})</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label={t('common.close') || 'Kapat'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Gövdesi */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <p className="text-xs text-[#9ba0b5] leading-relaxed">
            {t('containers.tagsModalDesc') ||
              'Bu konteyner için filtreleme ve gruplamada kullanılacak özel etiketleri belirleyin.'}
          </p>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#eceef6]">
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
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {t('common.cancel') || 'İptal'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-black hover:bg-[#d5d5dc] text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
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
