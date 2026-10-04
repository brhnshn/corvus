import React from 'react';
import { Layers } from 'lucide-react';
import { TagBadge } from './TagBadge';
import { useI18n } from '../../i18n';

export interface TagWithCount {
  tag: string;
  count: number;
}

export interface TagFilterBarProps {
  tagsWithCounts: TagWithCount[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  totalCount?: number;
  totalServicesCount?: number;
  label?: string;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  tagsWithCounts,
  selectedTag,
  onSelectTag,
  totalCount,
  totalServicesCount,
  label,
}) => {
  const { t } = useI18n();
  const effectiveTotalCount = totalCount ?? totalServicesCount;

  if (tagsWithCounts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar select-none">
      <div className="flex items-center gap-1.5 text-xs text-white/60 shrink-0 mr-1">
        <Layers className="w-3.5 h-3.5 text-white/50" />
        <span className="font-medium text-[11px] uppercase tracking-wider text-white/40">
          {label || t('services.filterByTag') || t('containers.filterByTag') || 'Etiket'}:
        </span>
      </div>

      {/* "All" button */}
      <button
        type="button"
        onClick={() => onSelectTag(null)}
        className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
          selectedTag === null
            ? 'bg-white border-white text-black shadow-xs font-semibold'
            : 'bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:border-white/20'
        }`}
      >
        <span>{t('common.all') || 'Tümü'}</span>
        {typeof effectiveTotalCount === 'number' && (
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded-full ${
              selectedTag === null ? 'bg-black/15 text-black font-bold' : 'bg-white/10 text-white/60'
            }`}
          >
            {effectiveTotalCount}
          </span>
        )}
      </button>

      {/* Dynamic Tag Pills */}
      {tagsWithCounts.map(({ tag, count }) => {
        const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
        return (
          <TagBadge
            key={tag}
            tag={tag}
            count={count}
            isActive={isSelected}
            onClick={() => onSelectTag(isSelected ? null : tag)}
            size="sm"
            className="shrink-0"
          />
        );
      })}
    </div>
  );
};
