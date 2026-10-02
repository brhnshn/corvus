import React, { useState, useEffect } from 'react';
import { Server, RefreshCw } from 'lucide-react';
import { api, type Service, type UptimeCheckItem } from '../../api/client';
import { useI18n } from '../../i18n';
import { UptimeBar } from './UptimeBar';
import { UptimeServiceSelector } from './UptimeServiceSelector';
import { UptimeStatsCards } from './UptimeStatsCards';
import { UptimeRecentChecks } from './UptimeRecentChecks';
import { EditServiceModal } from '../Services/EditServiceModal';
import { DiscoveredServicesSection } from './components/DiscoveredServicesSection';
import { EnableUptimeModal } from './components/EnableUptimeModal';
import { DisableUptimeDialog } from './components/DisableUptimeDialog';

interface PingUptimeTabProps {
  services: Service[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  onRefreshServices?: () => Promise<void>;
}

export const PingUptimeTab: React.FC<PingUptimeTabProps> = ({
  services,
  selectedServiceId,
  onSelectService,
  onRefreshServices
}) => {
  const { t } = useI18n();
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [checks, setChecks] = useState<UptimeCheckItem[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'down'>('all');

  const [editingService, setEditingService] = useState<Service | null>(null);
  const [enablingService, setEnablingService] = useState<Service | null>(null);
  const [disablingService, setDisablingService] = useState<Service | null>(null);

  // Opt-in Uptime Ayrımı: Sadece isUptimeEnabled = true olanlar izlenen servislerdir
  const monitoredServices = services.filter((s) => s.isUptimeEnabled);
  const unmonitoredServices = services.filter((s) => !s.isUptimeEnabled);

  const selectedService = monitoredServices.find((s) => s.id === selectedServiceId) || monitoredServices[0];

  const isMountedRef = React.useRef(true);

  const loadChecks = React.useCallback(async (serviceId: string, currentRange: string) => {
    if (!serviceId) {
      if (isMountedRef.current) setChecks([]);
      return;
    }
    if (isMountedRef.current) setLoadingChecks(true);
    try {
      const data = await api.getUptimeChecks(serviceId, currentRange);
      if (isMountedRef.current) setChecks(data);
    } catch (err: unknown) {
      if (isMountedRef.current) console.error('Uptime kontrolleri yüklenemedi:', err);
    } finally {
      if (isMountedRef.current) setLoadingChecks(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (selectedService?.id) {
      loadChecks(selectedService.id, range);
      const interval = setInterval(() => {
        if (!document.hidden && isMountedRef.current) loadChecks(selectedService.id, range);
      }, 30000);

      const onVisible = () => {
        if (!document.hidden && isMountedRef.current) loadChecks(selectedService.id, range);
      };
      document.addEventListener('visibilitychange', onVisible);

      return () => {
        isMountedRef.current = false;
        clearInterval(interval);
        document.removeEventListener('visibilitychange', onVisible);
      };
    }
  }, [selectedService?.id, range, loadChecks]);

  const handleRefreshAll = async () => {
    if (onRefreshServices) await onRefreshServices();
    if (selectedService?.id) loadChecks(selectedService.id, range);
  };

  const filteredMonitoredServices = monitoredServices.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (statusFilter === 'healthy') return s.status === 'healthy';
    if (statusFilter === 'down') return s.status === 'down';
    return true;
  });

  const recentChecks = [...checks].reverse().slice(0, 20);

  const rangeLabels: Record<string, string> = {
    '24h': t('uptime.range24h'),
    '7d': t('uptime.range7d'),
    '30d': t('uptime.range30d')
  };

  return (
    <div className="space-y-8">
      {/* 1. Aktif İzlenen Servisler Bölümü */}
      {monitoredServices.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#1a1d29] border border-[#2a2e3f] text-center max-w-lg mx-auto space-y-3">
          <Server className="w-10 h-10 text-[#9ca3af]/40 mx-auto" />
          <h3 className="text-base font-semibold text-[#e5e7eb]">Aktif Uptime İzlemesi Yok</h3>
          <p className="text-xs text-[#9ca3af] leading-relaxed">
            Şu anda Uptime takibi açık bir servis bulunmuyor. Aşağıdaki keşfedilen konteynerleri izlemeye alabilir veya manuel servis ekleyebilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <UptimeServiceSelector
            services={monitoredServices}
            filteredServices={filteredMonitoredServices}
            selectedServiceId={selectedService?.id}
            search={search}
            statusFilter={statusFilter}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onSelectService={onSelectService}
          />

          {selectedService && (
            <div className="space-y-6">
              {/* Header & Range Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] flex items-center justify-center text-[#d4d4d8] font-bold text-sm shrink-0">
                    {selectedService.icon ? (
                      <span>{selectedService.icon}</span>
                    ) : (
                      <Server className="w-5 h-5 text-[#9ca3af]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#e5e7eb] flex items-center gap-2">
                      <span>{selectedService.name}</span>
                      {selectedService.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1d29] border border-[#2a2e3f] text-[#9ca3af] font-normal">
                          {selectedService.category}
                        </span>
                      )}
                    </h2>
                    <span className="text-xs text-[#9ca3af] font-mono">
                      {selectedService.checkType === 'docker' || (selectedService.source === 'docker' && !selectedService.url && !selectedService.healthCheckUrl)
                        ? 'Docker Daemon Kontrolü'
                        : selectedService.checkType === 'tcp'
                        ? 'TCP Kontrolü'
                        : selectedService.checkType === 'ping'
                        ? 'ICMP Ping Kontrolü'
                        : selectedService.checkType === 'none'
                        ? 'Kontrol Devre Dışı'
                        : 'HTTP/S Kontrolü'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center p-0.5 rounded-lg bg-[#1a1d29] border border-[#2a2e3f] self-start sm:self-auto">
                  {(['24h', '7d', '30d'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                        range === r
                          ? 'bg-[#0f1117] text-white shadow-sm'
                          : 'text-[#9ca3af] hover:text-[#e5e7eb]'
                      }`}
                    >
                      {rangeLabels[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2 Sütunlu Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Sol Sütun: Stats Kartları ve SLA Zaman Çizelgesi */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                  <UptimeStatsCards
                    selectedService={selectedService}
                    checks={checks}
                    rangeLabel={rangeLabels[range]}
                    onEditService={setEditingService}
                    onDisableUptime={setDisablingService}
                  />

                  {/* SLA Timeline */}
                  <div className="p-5 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[#e5e7eb] flex items-center gap-2">
                        <span>{t('uptime.historyTimeline')}</span>
                        <span className="text-xs text-[#9ca3af] font-normal font-mono">
                          ({rangeLabels[range]})
                        </span>
                      </h3>
                      {loadingChecks && (
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      )}
                    </div>
                    <UptimeBar checks={checks} maxBlocks={45} />
                  </div>
                </div>

                {/* Sağ Sütun: Son Kontroller */}
                <div className="lg:col-span-5 xl:col-span-4">
                  <UptimeRecentChecks
                    recentChecks={recentChecks}
                    loadingChecks={loadingChecks}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Keşfedilen Konteynerler Bölümü */}
      <DiscoveredServicesSection
        unmonitoredServices={unmonitoredServices}
        onEnableUptime={(service) => setEnablingService(service)}
      />

      {/* Modallar */}
      <EditServiceModal
        isOpen={!!editingService}
        service={editingService}
        onClose={() => setEditingService(null)}
        onSuccess={handleRefreshAll}
      />

      <EnableUptimeModal
        isOpen={!!enablingService}
        service={enablingService}
        onClose={() => setEnablingService(null)}
        onSuccess={handleRefreshAll}
      />

      <DisableUptimeDialog
        isOpen={!!disablingService}
        service={disablingService}
        onClose={() => setDisablingService(null)}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
};
