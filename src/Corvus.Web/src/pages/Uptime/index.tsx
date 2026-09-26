import React, { useEffect, useState } from 'react';
import { api, type Service, type PushMonitor } from '../../api/client';
import { Activity, Radio } from 'lucide-react';
import { useI18n } from '../../i18n';
import { PingUptimeTab } from './PingUptimeTab';
import { PushMonitorsTab } from './PushMonitorsTab';

export const UptimePage: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'uptime' | 'snitch'>('uptime');

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
      if (isMountedRef.current) setSnitches(data);
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
    } else {
      fetchSnitches();
    }

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) {
        if (activeTab === 'uptime') {
          fetchServices();
        } else {
          fetchSnitches();
        }
      }
    }, 25000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) {
        if (activeTab === 'uptime') {
          fetchServices();
        } else {
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

  return (
    <div className="space-y-6">
      {/* Header and Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e5e7eb]">{t('uptime.title')}</h1>
          <p className="text-sm text-[#9ca3af]">{t('uptime.subtitle')}</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#1a1d29] border border-[#2a2e3f] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('uptime')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'uptime' ? 'bg-[#0f1117] text-white shadow-sm' : 'text-[#9ca3af] hover:text-[#e5e7eb]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            {t('uptime.tabPing')}
          </button>
          <button
            onClick={() => setActiveTab('snitch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'snitch' ? 'bg-[#0f1117] text-white shadow-sm' : 'text-[#9ca3af] hover:text-[#e5e7eb]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            {t('uptime.tabPush')}
          </button>
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
    </div>
  );
};

export default UptimePage;
