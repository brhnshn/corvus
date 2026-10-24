import React from 'react';
import { RefreshCw, Boxes } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface ContainersEmptyStatesProps {
  loading: boolean;
  total: number;
  filteredCount: number;
  onRefresh: () => void;
  onClearFilters: () => void;
}

export const ContainersEmptyStates: React.FC<ContainersEmptyStatesProps> = ({
  loading,
  total,
  filteredCount,
  onRefresh,
  onClearFilters,
}) => {
  const { t } = useI18n();

  // Yükleniyor Durumu
  if (loading && total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#9ba0b5]">
        <RefreshCw className="w-7 h-7 animate-spin text-[#d5d5dc] mb-3" />
        <span className="text-xs font-mono tracking-wider">{t('common.loading')}</span>
      </div>
    );
  }

  // Boş Durum (Hiç konteyner yok)
  if (!loading && total === 0) {
    return (
      <EmptyState
        icon={<Boxes className="w-6 h-6" />}
        title={t('containers.noContainersFound')}
        description={t('containers.noContainersDesc')}
        action={
          <Button variant="secondary" onClick={onRefresh}>
            {t('containers.refreshList')}
          </Button>
        }
      />
    );
  }

  // Filtre Sonucu Boş Durumu
  if (!loading && total > 0 && filteredCount === 0) {
    return (
      <EmptyState
        title={t('containers.noMatchingTitle')}
        description={t('containers.noMatchingDesc')}
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            {t('containers.clearFilters')}
          </Button>
        }
      />
    );
  }

  return null;
};
