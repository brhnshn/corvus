import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface DashboardHeaderProps {
  subtitle: string;
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  subtitle,
  onNavigate,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
      {/* Üst Başlık */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--cloud-100)]">
          {t('dashboard.title')}
        </h1>
        <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
          {subtitle}
        </p>
      </div>

      {/* Sağ Taraf: Hızlı Eylem */}
      {onNavigate && (
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="cloud"
            size="sm"
            onClick={() => onNavigate('services')}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            <span>{t('dashboard.addService')}</span>
          </Button>
        </div>
      )}
    </div>
  );
};
