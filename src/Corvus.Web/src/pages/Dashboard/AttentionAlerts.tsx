import React from 'react';
import { AlertStrip } from '../../components/ui/AlertStrip';
import { Button } from '../../components/ui/Button';
import { useI18n } from '../../i18n';
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
  const { t } = useI18n();
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
              <strong>{service.name}</strong> {t('dashboard.serviceUnreachable')}{' '}
              <span className="opacity-75 font-mono text-[11px]">
                {t('dashboard.serviceNoResponse', { url: service.url || t('dashboard.serviceCheckType', { type: service.checkType?.toUpperCase() ?? 'HTTP' }) })}
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
                {t('dashboard.goToService')}
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
              <strong>{service.name}</strong> {t('dashboard.serviceDegraded')}
            </span>
          }
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('services')}
              >
                {t('dashboard.inspectBtn')}
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
              <strong>{service.name}</strong> {t('dashboard.sslExpiringSoon', { days: service.sslExpiryDays ?? 0 })}
            </span>
          }
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('services')}
              >
                {t('dashboard.viewBtn')}
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
                <strong>{cleanName}</strong> {t('dashboard.containerStopped')}{' '}
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
                  {t('dashboard.goToContainers')}
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
              <strong>{pm.name}</strong> {t('dashboard.cronHeartbeatLost')}
            </span>
          }
          action={
            onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate('uptime')}
              >
                {t('dashboard.goToUptime')}
              </Button>
            )
          }
        />
      ))}
    </div>
  );
};

