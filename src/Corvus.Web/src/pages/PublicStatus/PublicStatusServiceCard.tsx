import { ShieldCheck, ExternalLink } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatServiceUrl } from '../../utils/url';
import type { PublicService } from '../../types';
import { PublicStatusServiceBar } from './PublicStatusServiceBar';

interface PublicStatusServiceCardProps {
  service: PublicService;
}

export function PublicStatusServiceCard({ service }: PublicStatusServiceCardProps) {
  const { t } = useI18n();

  const isHealthy = service.status === 'healthy' || service.status === 'up';
  const isDegraded = service.status === 'degraded';

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col gap-3 shadow-sm">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-slate-300 shrink-0 text-sm shadow-inner">
            {service.icon ? (
              <span className="text-base">{service.icon}</span>
            ) : (
              service.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white truncate text-sm">{service.name}</h4>
              {service.url && (
                <a
                  href={formatServiceUrl(service.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  title={service.url}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {service.description && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{service.description}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto flex-wrap">
          {/* SSL Expiry */}
          {service.sslExpiryDays !== null && service.sslExpiryDays !== undefined && (
            <span
              className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 font-medium ${
                service.sslExpiryDays <= 7
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : service.sslExpiryDays <= 14
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
              title={t('publicStatus.sslTooltip', { days: service.sslExpiryDays })}
            >
              <ShieldCheck className="w-3 h-3" />
              {t('publicStatus.sslDays', { days: service.sslExpiryDays })}
            </span>
          )}

          {/* Uptime % */}
          <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/60">
            {t('publicStatus.uptimeRate', { rate: service.uptimePercentage })}
          </span>

          {/* Status indicator */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1.5 ${
              isHealthy
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : isDegraded
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isHealthy
                  ? 'bg-emerald-400 animate-pulse'
                  : isDegraded
                  ? 'bg-amber-400'
                  : 'bg-rose-400 animate-ping'
              }`}
            />
            {isHealthy
              ? t('publicStatus.statusHealthy')
              : isDegraded
              ? t('publicStatus.statusDegraded')
              : t('publicStatus.statusDown')}
          </span>
        </div>
      </div>

      {/* Mini Uptime Status Bar */}
      <PublicStatusServiceBar checks={service.recentChecks} />
    </div>
  );
}
