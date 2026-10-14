import React from 'react';
import { Plus, Boxes, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { StatusDot } from '../../components/ui/StatusDot';
import { useI18n } from '../../i18n';

export interface DashboardHeaderProps {
  subtitle: string;
  memoryUsageMb?: number;
  isLiveStream?: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  subtitle,
  memoryUsageMb = 28,
  isLiveStream = false,
  onRefresh,
  refreshing,
  onNavigate,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-3 mb-2">
      {/* Üst Başlık & Canlı Durum Rozeti */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--cloud-100)]">
            {t('dashboard.title')}
          </h1>
          <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Canlı Sistem & Corvus Bellek Rozeti */}
        <div className="flex items-center gap-2">
          <div className="badge flex items-center gap-1.5 px-2.5 py-1 text-xs">
            <StatusDot status={isLiveStream ? "up" : "warn"} />
            <span className="font-mono text-[11px] text-[var(--cloud-200)]">
              Corvus AOT {memoryUsageMb} MB {isLiveStream ? '· 100ms Sync' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Hızlı Aksiyon Butonları */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {onNavigate && (
          <>
            <Button
              variant="cloud"
              size="sm"
              onClick={() => onNavigate('services')}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              <span>{t('dashboard.addService')}</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigate('containers')}
              icon={<Boxes className="w-3.5 h-3.5" />}
            >
              <span>{t('dashboard.viewContainers')}</span>
            </Button>
          </>
        )}

        <a
          href="/status"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-ghost inline-flex items-center gap-1.5 shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>{t('nav.liveStatus')}</span>
        </a>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
        >
          <span>{refreshing ? t('common.loading') : t('common.refresh')}</span>
        </Button>
      </div>
    </div>
  );
};

