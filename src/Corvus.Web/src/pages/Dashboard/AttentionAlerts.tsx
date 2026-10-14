import React from 'react';
import { AlertStrip } from '../../components/ui/AlertStrip';
import { Button } from '../../components/ui/Button';
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
    <div className="space-y-2">
      {/* Erişilemeyen Servisler */}
      {downServices.map((service) => (
        <AlertStrip
          key={service.id}
          type="danger"
          message={
            <span>
              <strong>{service.name}</strong> erişilemiyor{' '}
              <span className="opacity-75 font-mono text-[11px]">
                ({service.url || `${service.checkType?.toUpperCase()} servisi`} yanıt vermiyor)
              </span>
            </span>
          }
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('services')}
              >
                Servise Git →
              </Button>
            )
          }
        />
      ))}

      {/* Yavaş / Bozulmuş Servisler */}
      {degradedServices.map((service) => (
        <AlertStrip
          key={service.id}
          type="warn"
          message={
            <span>
              <strong>{service.name}</strong> performans düşüşü tespit edildi (yanıt süresi yüksek)
            </span>
          }
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('services')}
              >
                İncele →
              </Button>
            )
          }
        />
      ))}

      {/* SSL Süresi Yaklaşanlar */}
      {sslWarnings.map((service) => (
        <AlertStrip
          key={`ssl-${service.id}`}
          type="warn"
          message={
            <span>
              <strong>{service.name}</strong> SSL sertifikası yakında dolacak (kalan: {service.sslExpiryDays} gün)
            </span>
          }
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('services')}
              >
                Görüntüle →
              </Button>
            )
          }
        />
      ))}

      {/* Beklenmedik Şekilde Durmuş Konteynerler */}
      {stoppedContainers.map((container) => {
        const cleanName = (container.Names?.[0] || container.Id).replace(/^\//, '');
        return (
          <AlertStrip
            key={container.Id}
            type="danger"
            message={
              <span>
                <strong>{cleanName}</strong> konteyneri durdu{' '}
                <span className="opacity-75 font-mono text-[11px]">({container.Status || 'Exited'})</span>
              </span>
            }
            action={
              onNavigate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onNavigate('containers')}
                >
                  Konteynerlere Git →
                </Button>
              )
            }
          />
        );
      })}

      {/* Arıza Veren Push Monitor'ler */}
      {failedPushMonitors.map((pm) => (
        <AlertStrip
          key={pm.id}
          type="danger"
          message={
            <span>
              <strong>{pm.name}</strong> cron kalp atışı (heartbeat) kesildi
            </span>
          }
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('uptime')}
              >
                Uptime Takibi →
              </Button>
            )
          }
        />
      ))}
    </div>
  );
};

