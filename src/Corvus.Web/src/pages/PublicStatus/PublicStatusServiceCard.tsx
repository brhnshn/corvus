import { ExternalLink } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatServiceUrl } from '../../utils/url';
import type { PublicService } from '../../types';
import { PublicStatusServiceBar } from './PublicStatusServiceBar';
import { Pill, type StatusType } from '../../components/ui/Pill';
import { SslBadge } from '../../components/ui/SslBadge';

interface PublicStatusServiceCardProps {
  service: PublicService;
}

export function PublicStatusServiceCard({ service }: PublicStatusServiceCardProps) {
  const { t } = useI18n();

  const isHealthy = service.status === 'healthy' || service.status === 'up';
  const isDegraded = service.status === 'degraded';

  const statusType: StatusType = isHealthy ? 'ok' : isDegraded ? 'warn' : 'err';
  const statusLabel = isHealthy
    ? (t('publicStatus.statusHealthy') || 'Çalışıyor')
    : isDegraded
    ? (t('publicStatus.statusDegraded') || 'Aksaklık')
    : (t('publicStatus.statusDown') || 'Kesinti');

  return (
    <div className="surface rounded-[20px] p-4 flex flex-col gap-3 transition-colors hover:bg-white/[0.04]">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center font-bold text-[#eceef6] shrink-0 text-sm shadow-inner font-mono">
            {service.icon ? (
              <span className="text-base">{service.icon}</span>
            ) : (
              service.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-[#eceef6] truncate text-sm">{service.name}</h4>
              {service.url && (
                <a
                  href={formatServiceUrl(service.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#9ba0b5] hover:text-[#eceef6] transition-colors"
                  title={service.url}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {service.description && (
              <p className="text-xs text-[#9ba0b5] truncate mt-0.5">{service.description}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {/* SSL Expiry */}
          {service.sslExpiryDays !== null && service.sslExpiryDays !== undefined && (
            <SslBadge daysRemaining={service.sslExpiryDays} />
          )}

          {/* Uptime % */}
          <span className="text-xs font-semibold text-[#eceef6] bg-white/[0.06] border border-white/10 px-2.5 py-1 rounded-[10px] font-mono">
            {t('publicStatus.uptimeRate', { rate: service.uptimePercentage }) || `%${service.uptimePercentage}`}
          </span>

          {/* Status indicator */}
          <Pill status={statusType} label={statusLabel} />
        </div>
      </div>

      {/* 90-Day History Bars */}
      <PublicStatusServiceBar 
        checks={service.recentChecks} 
        totalSlots={30} 
      />
    </div>
  );
}
