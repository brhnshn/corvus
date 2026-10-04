import React from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface ContainersHeaderProps {
  onPruneClick: () => void;
  onRefreshClick: () => void;
  refreshing?: boolean;
}

export const ContainersHeader: React.FC<ContainersHeaderProps> = ({
  onPruneClick,
  onRefreshClick,
  refreshing = false,
}) => {
  const { t } = useI18n();

  return (
    <PageHeader
      title={t('containers.title')}
      subtitle={t('containers.subtitle')}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            onClick={onPruneClick}
            icon={<Trash2 className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">Sistem Temizliği</span>
            <span className="sm:hidden">Temizlik</span>
          </Button>

          <Button
            variant="secondary"
            onClick={onRefreshClick}
            disabled={refreshing}
            icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            aria-label={t('common.refresh')}
          >
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </Button>
        </div>
      }
    />
  );
};
