import React from 'react';
import { QuietBanner } from '../../components/ui/QuietBanner';
import { Button } from '../../components/ui/Button';

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
          <>
            <Button
              size="sm"
              variant="default"
              onClick={() => onNavigate(isHealthy ? 'metrics' : 'services')}
            >
              {isHealthy ? 'Sistem Metrikleri →' : 'Servisleri İncele →'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('containers')}
            >
              Konteynerler
            </Button>
          </>
        )
      }
    />
  );
};

