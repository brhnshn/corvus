import React from 'react';
import { AlertCircle, AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react';
import type { Service, DockerContainer, PushMonitor } from '../../types';

export interface AttentionAlertsProps {
  services: Service[];
  stoppedContainers: DockerContainer[];
  failedPushMonitors: PushMonitor[];
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings') => void;
}

export const AttentionAlerts: React.FC<AttentionAlertsProps> = ({
  services,
  stoppedContainers,
  failedPushMonitors,
  onNavigate,
}) => {
  const downServices = services.filter((s) => s.status === 'down');
  const degradedServices = services.filter((s) => s.status === 'degraded');
  const sslWarnings = services.filter(
    (s) => typeof s.sslExpiryDays === 'number' && s.sslExpiryDays <= 14 && s.sslExpiryDays >= 0
  );

  const hasIssues =
    downServices.length > 0 ||
    degradedServices.length > 0 ||
    stoppedContainers.length > 0 ||
    failedPushMonitors.length > 0 ||
    sslWarnings.length > 0;

  if (!hasIssues) return null;

  return (
    <div className="space-y-2 animate-rv" style={{ animationDelay: '160ms' }}>
      {/* Erişilemeyen Servisler */}
      {downServices.map((service) => (
        <div
          key={service.id}
          onClick={() => onNavigate?.('services')}
          className="flex items-center gap-3 p-3.5 rounded-[16px] bg-[#f87171]/10 border border-[#f87171]/35 cursor-pointer transition-transform duration-200 active:scale-[0.98] hover:bg-[#f87171]/15"
        >
          <AlertCircle className="w-5 h-5 text-[#f87171] shrink-0" />
          <div className="min-w-0 flex-1">
            <b className="text-[13.5px] font-semibold text-[#eceef6] block truncate">
              {service.name} erişilemiyor
            </b>
            <small className="text-xs text-[#9ba0b5] block truncate">
              {service.url || `${service.checkType?.toUpperCase()} servisi`} yanıt vermiyor
            </small>
          </div>
          <span className="text-xs font-semibold text-[#f87171] flex items-center gap-1 shrink-0 ml-auto">
            İncele <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      ))}

      {/* Yavaş / Bozulmuş Servisler */}
      {degradedServices.map((service) => (
        <div
          key={service.id}
          onClick={() => onNavigate?.('services')}
          className="flex items-center gap-3 p-3.5 rounded-[16px] bg-[#fbbf24]/08 border border-[#fbbf24]/30 cursor-pointer transition-transform duration-200 active:scale-[0.98] hover:bg-[#fbbf24]/12"
        >
          <AlertTriangle className="w-5 h-5 text-[#fbbf24] shrink-0" />
          <div className="min-w-0 flex-1">
            <b className="text-[13.5px] font-semibold text-[#eceef6] block truncate">
              {service.name} performans düşüşü
            </b>
            <small className="text-xs text-[#9ba0b5] block truncate">
              Yanıt süresi eşiğin üzerinde veya kararsız çalışıyor
            </small>
          </div>
          <span className="text-xs font-semibold text-[#fbbf24] flex items-center gap-1 shrink-0 ml-auto">
            Git <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      ))}

      {/* SSL Süresi Yaklaşanlar */}
      {sslWarnings.map((service) => (
        <div
          key={`ssl-${service.id}`}
          onClick={() => onNavigate?.('services')}
          className="flex items-center gap-3 p-3.5 rounded-[16px] bg-[#fbbf24]/08 border border-[#fbbf24]/30 cursor-pointer transition-transform duration-200 active:scale-[0.98] hover:bg-[#fbbf24]/12"
        >
          <ShieldAlert className="w-5 h-5 text-[#fbbf24] shrink-0" />
          <div className="min-w-0 flex-1">
            <b className="text-[13.5px] font-semibold text-[#eceef6] block truncate">
              {service.name} SSL sertifikası yakında dolacak
            </b>
            <small className="text-xs text-[#9ba0b5] block">
              Kalan süre: {service.sslExpiryDays} gün
            </small>
          </div>
          <span className="text-xs font-semibold text-[#fbbf24] flex items-center gap-1 shrink-0 ml-auto">
            Git <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      ))}

      {/* Beklenmedik Şekilde Durmuş Konteynerler */}
      {stoppedContainers.map((container) => {
        const cleanName = (container.Names?.[0] || container.Id).replace(/^\//, '');
        return (
          <div
            key={container.Id}
            onClick={() => onNavigate?.('containers')}
            className="flex items-center gap-3 p-3.5 rounded-[16px] bg-[#f87171]/08 border border-[#f87171]/30 cursor-pointer transition-transform duration-200 active:scale-[0.98] hover:bg-[#f87171]/12"
          >
            <AlertCircle className="w-5 h-5 text-[#f87171] shrink-0" />
            <div className="min-w-0 flex-1">
              <b className="text-[13.5px] font-semibold text-[#eceef6] block truncate">
                {cleanName} konteyneri durdu
              </b>
              <small className="text-xs text-[#9ba0b5] font-mono block truncate">
                {container.Status || 'Exited'}
              </small>
            </div>
            <span className="text-xs font-semibold text-[#f87171] flex items-center gap-1 shrink-0 ml-auto">
              Konteynere Git <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        );
      })}
    </div>
  );
};
