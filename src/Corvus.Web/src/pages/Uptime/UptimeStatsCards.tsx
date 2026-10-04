import React from 'react';
import { Pencil, Container, PowerOff } from 'lucide-react';
import type { Service, UptimeCheckItem } from '../../types';
import { Pill, type StatusType } from '../../components/ui/Pill';
import { Button } from '../../components/ui/Button';
import { SslBadge } from '../../components/ui/SslBadge';
import { useI18n } from '../../i18n';

interface UptimeStatsCardsProps {
  selectedService: Service;
  checks: UptimeCheckItem[];
  rangeLabel: string;
  onEditService?: (service: Service) => void;
  onDisableUptime?: (service: Service) => void;
}

export const UptimeStatsCards: React.FC<UptimeStatsCardsProps> = ({
  selectedService,
  checks,
  rangeLabel,
  onEditService,
  onDisableUptime
}) => {
  const { t } = useI18n();

  const upChecks = checks.filter((c) => c.status === 'up');
  const hasChecks = checks.length > 0;
  const uptimePercent = hasChecks ? Math.round((upChecks.length / checks.length) * 100) : null;
  const avgLatency = upChecks.length > 0 
    ? Math.round(upChecks.reduce((acc, c) => acc + (c.responseTimeMs || 0), 0) / upChecks.length)
    : 0;

  const isDockerCheck = selectedService.checkType === 'docker' || 
    (selectedService.source === 'docker' && !selectedService.url && !selectedService.healthCheckUrl);

  const serviceStatusType: StatusType = 
    selectedService.status === 'healthy' ? 'ok' :
    selectedService.status === 'down' ? 'err' : 'warn';

  const serviceStatusLabel =
    selectedService.status === 'healthy' ? 'Çalışıyor' :
    selectedService.status === 'down' ? 'Kesinti' : 'Aksaklık';

  return (
    <div className="space-y-2.5">
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
        <div className="surface rounded-[20px] p-4 flex flex-col justify-between gap-2">
          <span className="text-xs text-[#9ba0b5] block font-medium">{t('uptime.statusCard') || 'Mevcut Durum'}</span>
          <div className="flex items-center gap-2">
            <Pill status={serviceStatusType} label={serviceStatusLabel} />
          </div>
        </div>

        <div className="surface rounded-[20px] p-4 flex flex-col justify-between gap-2">
          <span className="text-xs text-[#9ba0b5] block font-medium">
            {t('uptime.uptimeRatio', { range: rangeLabel }) || `Erişilebilirlik (${rangeLabel})`}
          </span>
          <div className="flex items-baseline gap-2">
            {uptimePercent !== null ? (
              <>
                <span
                  className={`text-2xl font-bold font-mono tracking-tight ${
                    uptimePercent >= 99
                      ? 'text-[#34d399]'
                      : uptimePercent >= 95
                      ? 'text-[#fbbf24]'
                      : 'text-[#f87171]'
                  }`}
                >
                  %{uptimePercent}
                </span>
                <span className="text-[11px] text-[#9ba0b5] font-mono">
                  ({upChecks.length}/{checks.length})
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold font-mono text-[#9ba0b5]">
                  —
                </span>
                <span className="text-[11px] text-[#9ba0b5]">
                  ({t('uptime.noChecksYet') || 'Henüz veri yok'})
                </span>
              </>
            )}
          </div>
        </div>

        <div className="surface rounded-[20px] p-4 flex flex-col justify-between gap-2">
          <span className="text-xs text-[#9ba0b5] block font-medium">{t('uptime.avgLatency') || 'Ort. Yanıt Süresi'}</span>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#eceef6]">
            {isDockerCheck ? (
              <span className="text-sm font-sans font-medium text-[#d5d5dc] flex items-center gap-1.5">
                <Container className="w-4 h-4 text-[#9ba0b5]" />
                <span>Docker Socket</span>
              </span>
            ) : avgLatency > 0 ? (
              `${avgLatency} ms`
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>

      {/* Hedef Bilgisi, SSL Rozeti ve Düzenleme Butonu */}
      <div className="surface rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs text-[#9ba0b5] block mb-0.5 font-medium">
            {isDockerCheck
              ? 'Kontrol Edilen Hedef'
              : selectedService.checkType === 'tcp'
              ? t('uptime.targetTcp') || 'TCP Soket'
              : selectedService.checkType === 'ping'
              ? t('uptime.targetPing') || 'ICMP Ping'
              : t('uptime.targetUrl') || 'HTTP(S) Uç Noktası'}
          </span>
          <span className="text-sm font-mono text-[#eceef6] break-all">
            {isDockerCheck
              ? `Docker Daemon (${selectedService.name}) — Konteyner Durum Takibi`
              : selectedService.checkType === 'tcp'
              ? `${selectedService.url || 'localhost'}:${selectedService.port || 80}`
              : selectedService.checkType === 'ping'
              ? `${selectedService.url || 'localhost'} (ICMP Echo)`
              : selectedService.healthCheckUrl || selectedService.url || t('uptime.noAddress')}
          </span>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {selectedService.sslExpiryDays !== null && selectedService.sslExpiryDays !== undefined && (
            <SslBadge daysRemaining={selectedService.sslExpiryDays} />
          )}

          {onEditService && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEditService(selectedService)}
              icon={<Pencil className="w-3.5 h-3.5" />}
            >
              {t('uptime.editEndpoint') || 'Hedefi Düzenle'}
            </Button>
          )}

          {onDisableUptime && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDisableUptime(selectedService)}
              icon={<PowerOff className="w-3.5 h-3.5 text-[#fbbf24]" />}
              className="text-[#fbbf24] hover:text-[#fbbf24] hover:bg-[#fbbf24]/10"
            >
              <span className="hidden sm:inline">Takibi Kapat</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
