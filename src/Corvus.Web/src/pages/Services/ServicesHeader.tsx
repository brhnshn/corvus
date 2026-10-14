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
  isAdmin?: boolean;
  systemName?: string;
}

export const ServicesHeader: React.FC<ServicesHeaderProps> = ({
  search,
  onSearchChange,
  onAddClick,
  onRefreshClick,
  refreshing = false,
  isAdmin = true,
  systemName,
}) => {
  const { t } = useI18n();

  return (
    <PageHeader
      title={t('services.title')}
      badge={
        systemName ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--bg-card)] border border-[var(--border-hairline)] text-[var(--cloud-200)] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cloud-400)]" />
            {systemName}
          </span>
        ) : undefined
      }
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

          {isAdmin && (
            <Button
              variant="primary"
              onClick={onAddClick}
              icon={<Plus className="w-4 h-4" />}
              className="shrink-0"
            >
              <span>{t('services.addService')}</span>
            </Button>
          )}

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
