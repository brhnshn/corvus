import React from 'react';
import { useI18n } from '../../i18n';
import { TagInput } from '../../components/common/TagInput';

interface EditServiceMetaSectionProps {
  category: string;
  onChangeCategory: (value: string) => void;
  icon: string;
  onChangeIcon: (value: string) => void;
  tags: string[];
  onChangeTags: (value: string[]) => void;
  description: string;
  onChangeDescription: (value: string) => void;
}

export const EditServiceMetaSection: React.FC<EditServiceMetaSectionProps> = ({
  category,
  onChangeCategory,
  icon,
  onChangeIcon,
  tags,
  onChangeTags,
  description,
  onChangeDescription
}) => {
  const { t } = useI18n();

  return (
    <>
      {/* Kategori ve İkon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('services.formCategory')}
          </label>
          <input
            type="text"
            placeholder={t('services.defaultCategory')}
            value={category}
            onChange={(e) => onChangeCategory(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('services.formIcon')} ({t('services.formIconHint')})
          </label>
          <input
            type="text"
            maxLength={4}
            placeholder={t('services.formIconPlaceholder')}
            value={icon}
            onChange={(e) => onChangeIcon(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Etiketler (Ortam / Grup) */}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1">
          {t('services.formTags')}
        </label>
        <TagInput
          tags={tags}
          onChange={onChangeTags}
          placeholder={t('services.tagPlaceholder')}
        />
      </div>

      {/* Açıklama */}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1">
          {t('services.formDescription')}
        </label>
        <textarea
          rows={2}
          placeholder={t('services.formDescriptionPlaceholder')}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs resize-none"
        />
      </div>
    </>
  );
};
