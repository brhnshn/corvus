import React from 'react';
import { FilterChip } from '../../components/ui/FilterChip';
import { tagHue } from '../../utils/tagHue';
import { useI18n } from '../../i18n';

export interface ContainersFilterChipsProps {
  totalCount: number;
  selectedTag: string | null;
  selectedState: string | null;
  tagsWithCounts: Array<{ tag: string; count: number }>;
  onSelectTag: (tag: string | null) => void;
  onSelectState: (state: string | null) => void;
}

export const ContainersFilterChips: React.FC<ContainersFilterChipsProps> = ({
  totalCount,
  selectedTag,
  selectedState,
  tagsWithCounts,
  onSelectTag,
  onSelectState,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <FilterChip
        label={t('common.all')}
        count={totalCount}
        selected={!selectedTag && !selectedState}
        onClick={() => {
          onSelectTag(null);
          onSelectState(null);
        }}
      />

      {tagsWithCounts.map(({ tag, count }) => {
        const h = tagHue(tag);
        return (
          <FilterChip
            key={tag}
            label={tag}
            count={count}
            dotColor={`hsl(${h} 80% 65%)`}
            selected={selectedTag?.toLowerCase() === tag.toLowerCase()}
            onClick={() =>
              onSelectTag(selectedTag?.toLowerCase() === tag.toLowerCase() ? null : tag)
            }
          />
        );
      })}
    </div>
  );
};
