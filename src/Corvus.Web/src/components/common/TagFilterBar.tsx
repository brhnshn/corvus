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
      <div className="flex items-center gap-1.5 text-xs text-[#9ca3af] shrink-0 mr-1">
        <Layers className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-medium text-[11px] uppercase tracking-wider text-[#6b7280]">
          {label || t('services.filterByTag') || t('containers.filterByTag') || 'Etiket'}:
        </span>
      </div>

      {/* "All" button */}
      <button
        type="button"
        onClick={() => onSelectTag(null)}
        className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
          selectedTag === null
            ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm shadow-indigo-500/20 font-semibold'
            : 'bg-[#1a1d29] border-[#2a2e3f] text-[#9ca3af] hover:text-[#e5e7eb] hover:border-[#3f4458]'
        }`}
      >
        <span>{t('common.all') || 'Tümü'}</span>
        {typeof effectiveTotalCount === 'number' && (
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded-full ${
              selectedTag === null ? 'bg-white/20 text-white' : 'bg-black/30 text-[#9ca3af]'
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
