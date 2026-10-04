import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SearchInput } from '../../components/ui/SearchInput';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface ServicesHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  onRefreshClick: () => void;
  refreshing?: boolean;
}

export const ServicesHeader: React.FC<ServicesHeaderProps> = ({
  search,
  onSearchChange,
  onAddClick,
  onRefreshClick,
  refreshing = false,
}) => {
  const { t } = useI18n();

  return (
    <PageHeader
      title={t('services.title')}
      subtitle={t('services.subtitle')}
      actions={
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder={t('services.searchPlaceholder')}
            />
          </div>

          <Button
            variant="primary"
            onClick={onAddClick}
            icon={<Plus className="w-4 h-4" />}
            className="shrink-0"
          >
            <span>{t('services.addService')}</span>
          </Button>

          <Button
            variant="icon"
            onClick={onRefreshClick}
            disabled={refreshing}
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            aria-label={t('common.refresh')}
            className="shrink-0"
          />
        </div>
      }
    />
  );
};
