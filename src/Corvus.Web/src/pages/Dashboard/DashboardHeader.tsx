import React from 'react';
import { Plus, Boxes, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface DashboardHeaderProps {
  subtitle: string;
  memoryUsageMb?: number;
  onRefresh: () => void;
  refreshing: boolean;
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  subtitle,
  memoryUsageMb = 28,
  onRefresh,
  refreshing,
  onNavigate,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-3.5 mb-3.5 animate-rv">
      {/* Üst Başlık & Canlı Durum Rozeti */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-[-0.5px] text-[#eceef6]">
            {t('dashboard.title')}
          </h1>
          <p className="text-[13px] text-[#9ba0b5] mt-1">
            {subtitle}
          </p>
        </div>

        {/* Canlı Sistem & Corvus Bellek Rozeti */}
        <div className="glass inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono text-xs font-medium text-[#9ba0b5]">
          <span className="w-2 h-2 rounded-full bg-[#34d399] animate-dot-pulse shrink-0" />
          <span className="text-[#eceef6]">Corvus {memoryUsageMb} MB</span>
        </div>
      </div>

      {/* Hızlı Aksiyon Butonları (Midnight v2 .qa şeridi) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {onNavigate && (
          <>
            <Button
              variant="primary"
              onClick={() => onNavigate('services')}
              icon={<Plus className="w-4 h-4" />}
            >
              <span>{t('dashboard.addService')}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => onNavigate('containers')}
              icon={<Boxes className="w-4 h-4" />}
            >
              <span>{t('dashboard.viewContainers')}</span>
            </Button>
          </>
        )}

        <a
          href="/status"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-[38px] px-3.5 rounded-full border border-white/10 bg-white/[0.08] text-[13px] font-semibold text-[#eceef6] hover:bg-white/[0.14] transition-colors cursor-pointer shrink-0"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-[#9ba0b5]" />
          <span>{t('nav.liveStatus')}</span>
        </a>

        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={refreshing}
          icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#d5d5dc]' : ''}`} />}
        >
          <span>{refreshing ? t('common.loading') : t('common.refresh')}</span>
        </Button>
      </div>
    </div>
  );
};
