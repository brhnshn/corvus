import React from 'react';
import { AlertOctagon, AlertTriangle, Info, Wrench, Pin, CheckCircle2, Clock } from 'lucide-react';
import type { ServiceIncident } from '../../types';
import { useI18n } from '../../i18n';

interface PublicStatusIncidentBannerProps {
  incidents?: ServiceIncident[];
}

export const PublicStatusIncidentBanner: React.FC<PublicStatusIncidentBannerProps> = ({ incidents }) => {
  const { t } = useI18n();

  if (!incidents || incidents.length === 0) {
    return null;
  }

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          container: 'bg-rose-950/40 border-rose-500/40 text-rose-200',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        };
      case 'maintenance':
        return {
          container: 'bg-purple-950/40 border-purple-500/40 text-purple-200',
          badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          icon: <Wrench className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        };
      case 'warning':
        return {
          container: 'bg-amber-950/40 border-amber-500/40 text-amber-200',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        };
      case 'info':
      default:
        return {
          container: 'bg-sky-950/40 border-sky-500/40 text-sky-200',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          icon: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'investigating':
        return t('incidents.statuses.investigating');
      case 'identified':
        return t('incidents.statuses.identified');
      case 'monitoring':
        return t('incidents.statuses.monitoring');
      case 'resolved':
        return t('incidents.statuses.resolved');
      default:
        return status;
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return t('incidents.severities.critical');
      case 'warning':
        return t('incidents.severities.warning');
      case 'maintenance':
        return t('incidents.severities.maintenance');
      case 'info':
      default:
        return t('incidents.severities.info');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      {incidents.map((incident) => {
        const style = getSeverityStyle(incident.severity);
        const isResolved = incident.status === 'resolved';

        return (
          <div
            key={incident.id}
            className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md shadow-lg transition-all ${style.container}`}
          >
            <div className="flex items-start gap-3.5">
              {isResolved ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                style.icon
              )}

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-semibold text-base text-white tracking-tight">
                    {incident.title}
                  </span>

                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}>
                    {getSeverityText(incident.severity)}
                  </span>

                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                      isResolved
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    {getStatusText(incident.status)}
                  </span>

                  {incident.isPinned && (
                    <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      <Pin className="w-3 h-3" />
                      {t('incidents.pinnedBadge')}
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed text-slate-200/90 whitespace-pre-line break-words">
                  {incident.message}
                </p>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs opacity-75">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t('incidents.createdAt')}: {formatDate(incident.createdAt)}
                  </span>
                  {incident.resolvedAt && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('incidents.resolvedAt')}: {formatDate(incident.resolvedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
