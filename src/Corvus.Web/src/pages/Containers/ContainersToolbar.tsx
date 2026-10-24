import React from 'react';
import { List, Layers } from 'lucide-react';
import { SearchInput } from '../../components/ui/SearchInput';
import { Segment } from '../../components/ui/Segment';
import { useI18n } from '../../i18n';

export interface ContainersToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  viewMode: 'flat' | 'compose';
  onViewModeChange: (mode: 'flat' | 'compose') => void;
}

export const ContainersToolbar: React.FC<ContainersToolbarProps> = ({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
      <div className="flex-1 min-w-[200px]">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder={t('containers.searchPlaceholder')}
        />
      </div>

      <Segment
        value={viewMode}
        onChange={(v) => onViewModeChange(v as 'flat' | 'compose')}
        options={[
          {
            value: 'flat',
            label: t('containers.viewFlat'),
            icon: <List className="w-3.5 h-3.5" />,
          },
          {
            value: 'compose',
            label: t('containers.viewGroups'),
            icon: <Layers className="w-3.5 h-3.5" />,
          },
        ]}
      />
    </div>
  );
};
