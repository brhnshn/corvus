import React, { useEffect, useState } from 'react';
import { api, type Service, type PushMonitor } from '../../api/client';
import { Activity, Radio, Megaphone } from 'lucide-react';
import { useI18n } from '../../i18n';
import { PingUptimeTab } from './PingUptimeTab';
import { PushMonitorsTab } from './PushMonitorsTab';
import { IncidentsTab } from './IncidentsTab';

export const UptimePage: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'uptime' | 'snitch' | 'incidents'>('uptime');

  // Uptime Services state
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');

  // Dead Man's Snitch state
  const [snitches, setSnitches] = useState<PushMonitor[]>([]);
  const [loadingSnitches, setLoadingSnitches] = useState(false);

  const isMountedRef = React.useRef(true);

  const fetchServices = React.useCallback(async () => {
    try {
      const data = await api.getServices();
      if (!isMountedRef.current) return;
      setServices(data);
      const monitored = data.filter((s) => s.isUptimeEnabled);
      if (monitored.length > 0) {
        setSelectedServiceId((prev) => {
          const exists = monitored.some((s) => s.id === prev);
          return exists ? prev : monitored[0].id;
        });
      } else {
        setSelectedServiceId('');
      }
    } catch (err) {
      if (isMountedRef.current) console.error('Servisler yüklenemedi:', err);
    }
  }, []);

  const fetchSnitches = React.useCallback(async () => {
    if (isMountedRef.current) setLoadingSnitches(true);
    try {
      const data = await api.getPushMonitors();
      if (!isMountedRef.current) return;
      setSnitches(data);
    } catch (err) {
      if (isMountedRef.current) console.error('Push monitörleri yüklenemedi:', err);
    } finally {
      if (isMountedRef.current) setLoadingSnitches(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeTab === 'uptime') {
      fetchServices();
    } else if (activeTab === 'snitch') {
      fetchSnitches();
    }

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) {
        if (activeTab === 'uptime') {
          fetchServices();
        } else if (activeTab === 'snitch') {
          fetchSnitches();
        }
      }
    }, 25000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) {
        if (activeTab === 'uptime') {
          fetchServices();
        } else if (activeTab === 'snitch') {
          fetchSnitches();
        }
      }
    };

    const handleCorvusEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const type: string | undefined = detail?.eventType || detail?.type;
      if (!isMountedRef.current) return;
      if (activeTab === 'uptime' && type?.includes('service')) {
        fetchServices();
      } else if (activeTab === 'snitch' && (type?.includes('push') || type?.includes('snitch'))) {
        fetchSnitches();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
    };
  }, [activeTab, fetchServices, fetchSnitches]);

  const tabs = [
    { id: 'uptime' as const, label: t('uptime.tabPing') || 'Uptime & SSL', icon: Activity },
    { id: 'snitch' as const, label: t('uptime.tabPush') || 'Push İzleme', icon: Radio },
    { id: 'incidents' as const, label: t('uptime.tabIncidents') || 'Olay Kayıtları', icon: Megaphone }
  ];

  return (
    <div className="space-y-4 animate-rv">
      {/* Header and Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#eceef6]">
            {t('uptime.title') || 'Gelişmiş Uptime & SSL Takibi'}
          </h1>
          <p className="text-[13px] text-[#9ba0b5] mt-0.5">
            {t('uptime.subtitle') || 'Yüksek hassasiyetli erişilebilirlik ve güvenlik sertifikası izleme'}
          </p>
        </div>

        {/* Tab Segment Controls */}
        <div className="glass rounded-[19px] p-[3px] flex gap-0.5 self-start sm:self-auto max-w-full overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[16px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs'
                    : 'text-[#9ba0b5] hover:text-[#eceef6]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1b1d2a]' : 'text-[#9ba0b5]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: HTTP & TCP Ping Uptime */}
      {activeTab === 'uptime' && (
        <PingUptimeTab
          services={services}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          onRefreshServices={fetchServices}
        />
      )}

      {/* Tab 2: Dead Man's Snitch */}
      {activeTab === 'snitch' && (
        <PushMonitorsTab
          snitches={snitches}
          loading={loadingSnitches}
          onRefresh={fetchSnitches}
        />
      )}

      {/* Tab 3: Incidents & Announcements */}
      {activeTab === 'incidents' && <IncidentsTab />}
    </div>
  );
};

export default UptimePage;
