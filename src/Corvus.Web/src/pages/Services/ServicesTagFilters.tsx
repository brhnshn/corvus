import React from 'react';
import { useI18n } from '../../i18n';
import { FilterChip } from '../../components/ui/FilterChip';
import { tagHue } from '../../utils/tagHue';
import type { TagCount } from './services.utils';

interface ServicesTagFiltersProps {
  totalCount: number;
  tagsWithCounts: TagCount[];
  selectedTag: string | null;
  selectedStatus: string | null;
  onSelectTag: React.Dispatch<React.SetStateAction<string | null>>;
  onClearAll: () => void;
}

export const ServicesTagFilters: React.FC<ServicesTagFiltersProps> = ({
  totalCount,
  tagsWithCounts,
  selectedTag,
  selectedStatus,
  onSelectTag,
  onClearAll
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      <FilterChip
        label={t('common.all')}
        count={totalCount}
        selected={!selectedTag && !selectedStatus}
        onClick={onClearAll}
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
              onSelectTag((prev) => (prev?.toLowerCase() === tag.toLowerCase() ? null : tag))
            }
          />
        );
      })}
    </div>
  );
};
