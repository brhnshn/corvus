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
          container: 'surface border-[#f87171]/40 text-[#eceef6]',
          badge: 'bg-[#f87171]/20 text-[#f87171] border-[#f87171]/40',
          icon: <AlertOctagon className="w-5 h-5 text-[#f87171] shrink-0 mt-0.5" />
        };
      case 'maintenance':
        return {
          container: 'surface border-[#818cf8]/40 text-[#eceef6]',
          badge: 'bg-[#818cf8]/20 text-[#818cf8] border-[#818cf8]/40',
          icon: <Wrench className="w-5 h-5 text-[#818cf8] shrink-0 mt-0.5" />
        };
      case 'warning':
        return {
          container: 'surface border-[#fbbf24]/40 text-[#eceef6]',
          badge: 'bg-[#fbbf24]/20 text-[#fbbf24] border-[#fbbf24]/40',
          icon: <AlertTriangle className="w-5 h-5 text-[#fbbf24] shrink-0 mt-0.5" />
        };
      case 'info':
      default:
        return {
          container: 'surface border-white/20 text-[#eceef6]',
          badge: 'bg-white/10 text-[#d5d5dc] border-white/20',
          icon: <Info className="w-5 h-5 text-[#d5d5dc] shrink-0 mt-0.5" />
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'investigating':
        return t('incidents.statuses.investigating') || 'Araştırılıyor';
      case 'identified':
        return t('incidents.statuses.identified') || 'Tespit Edildi';
      case 'monitoring':
        return t('incidents.statuses.monitoring') || 'İzleniyor';
      case 'resolved':
        return t('incidents.statuses.resolved') || 'Çözüldü';
      default:
        return status;
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
            className={`p-4 sm:p-5 rounded-[20px] border shadow-lg transition-all ${style.container} ${
              isResolved ? 'opacity-80' : ''
            }`}
          >
            <div className="flex items-start gap-3.5">
              {style.icon}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {incident.isPinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[8px] bg-white/[0.08] text-[#d5d5dc] font-medium border border-white/15">
                      <Pin className="w-3 h-3" />
                      <span>Sabitlendi</span>
                    </span>
                  )}
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-[8px] border font-semibold font-mono uppercase tracking-wider ${style.badge}`}
                  >
                    {incident.severity}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-[8px] border font-medium ${
                      isResolved
                        ? 'bg-[#34d399]/15 text-[#34d399] border-[#34d399]/30'
                        : 'bg-white/[0.06] text-[#9ba0b5] border-white/10'
                    }`}
                  >
                    {isResolved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>{getStatusText(incident.status)}</span>
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-[#eceef6] mt-1">{incident.title}</h3>

                {incident.message && (
                  <p className="text-xs sm:text-sm text-[#9ba0b5] mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {incident.message}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#9ba0b5] font-mono mt-3 pt-2.5 border-t border-white/10">
                  <span>
                    Başlangıç: {new Date(incident.createdAt).toLocaleString()}
                  </span>
                  {incident.resolvedAt && (
                    <span className="text-[#34d399]">
                      Çözüldü: {new Date(incident.resolvedAt).toLocaleString()}
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
