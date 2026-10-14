import React from 'react';
import { QuietBanner } from '../../components/ui/QuietBanner';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';

export interface SystemBannerProps {
  status: 'ok' | 'warn' | 'err';
  message: string;
  subtext?: string;
  lastCheckText?: string;
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings') => void;
}

export const SystemBanner: React.FC<SystemBannerProps> = ({
  status,
  message,
  subtext,
  lastCheckText,
  onNavigate,
}) => {
  const { t } = useI18n();
  const isHealthy = status === 'ok';

  return (
    <QuietBanner
      summary={
        <span>
          <strong className="text-[var(--cloud-100)] font-semibold">{message}</strong>
          {subtext && <span className="ml-1 text-[var(--text-secondary)]">· {subtext}</span>}
          {lastCheckText && (
            <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
              ({lastCheckText})
            </span>
          )}
        </span>
      }
      actions={
        onNavigate && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => onNavigate(isHealthy ? 'metrics' : 'services')}
            >
              {isHealthy ? (t('dashboard.systemMetrics') || 'Sistem Metrikleri →') : (t('dashboard.viewServices') || 'Servisleri İncele →')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('containers')}
            >
              {t('nav.containers') || 'Konteynerler'}
            </Button>
          </div>
        )
      }
    />
  );
};
