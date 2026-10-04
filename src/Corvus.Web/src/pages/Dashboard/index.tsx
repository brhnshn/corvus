import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  api, 
  type DashboardSummary, 
  type Service, 
  type PushMonitor, 
  type DockerContainer,
  type ContainerStats,
} from '../../api/client';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n';

// Modüler Alt Bileşenler (Midnight v2 & Clean Architecture)
import { DashboardHeader } from './DashboardHeader';
import { SystemBanner } from './SystemBanner';
import { DashboardKpis } from './DashboardKpis';
import { AttentionAlerts } from './AttentionAlerts';
import { DockerOverviewSection } from './DockerOverviewSection';
import { TopResourcesCard } from './TopResourcesCard';
import { RecentEventsCard, type EventItem } from './RecentEventsCard';

export interface DashboardPageProps {
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { t } = useI18n();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [pushMonitors, setPushMonitors] = useState<PushMonitor[]>([]);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [containerStats, setContainerStats] = useState<Record<string, ContainerStats>>({});
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh && isMountedRef.current) setRefreshing(true);
    try {
      const [sumData, srvData, pmData, cntData, statsData] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getServices(),
        api.getPushMonitors(),
        api.getContainers(),
        api.getContainersStatsSummary(),
      ]);

      if (!isMountedRef.current) return;

      if (sumData.status === 'fulfilled') setSummary(sumData.value);
      if (srvData.status === 'fulfilled') setServices(srvData.value);
      if (pmData.status === 'fulfilled') setPushMonitors(pmData.value);
      if (cntData.status === 'fulfilled') setContainers(cntData.value);
      if (statsData.status === 'fulfilled') setContainerStats(statsData.value);

      setError(null);
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Veriler yüklenemedi');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        if (isManualRefresh) setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    // 30 saniyede bir arka planda güncelle (sekme aktifken)
    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadData();
    }, 30000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadData();
    };

    const handleCorvusEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const detail = customEvent.detail;
        const newEvent: EventItem = {
          id: String(Date.now()),
          status: detail.type?.includes('error') || detail.type?.includes('down') ? 'err' : 'ok',
          title: detail.message || detail.title || 'Sistem olayı algılandı',
          timeAgo: 'şimdi',
        };
        setLiveEvents((prev) => [newEvent, ...prev].slice(0, 5));
      }
      if (isMountedRef.current && !document.hidden) {
        loadData();
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
  }, [loadData]);

  if (loading && !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-[#9ba0b5]">
        <RefreshCw className="w-7 h-7 animate-spin text-[#d5d5dc] mb-3" />
        <span className="text-xs font-mono tracking-wider">{t('common.loading')}</span>
      </div>
    );
  }

  // Sorun hesaplamaları
  const downServices = loading ? 0 : (summary?.downServices ?? 0);
  const degradedServices = loading ? 0 : (summary?.degradedServices ?? 0);
  const failedPushMonitors = loading ? [] : pushMonitors.filter((p) => p.status === 'down');
  const stoppedContainers = loading
    ? []
    : containers.filter((c) => ['exited', 'dead'].includes(c.State.toLowerCase()));
  const sslWarningCount = loading
    ? 0
    : services.filter(
        (s) => typeof s.sslExpiryDays === 'number' && s.sslExpiryDays <= 14 && s.sslExpiryDays >= 0
      ).length;

  const totalIssues =
    downServices + degradedServices + failedPushMonitors.length + stoppedContainers.length + sslWarningCount;
  const isOverallHealthy = totalIssues === 0;
  const bannerStatus: 'ok' | 'warn' | 'err' = isOverallHealthy
    ? 'ok'
    : downServices > 0 || failedPushMonitors.length > 0 || stoppedContainers.length > 0
    ? 'err'
    : 'warn';

  const healthyServices = summary?.healthyServices ?? 0;
  const totalServices = summary?.totalServices ?? 0;

  const bannerMessage = isOverallHealthy
    ? `Tüm servisler sağlıklı · ${healthyServices}/${totalServices} aktif`
    : `${totalIssues} öğe dikkat gerektiriyor`;

  const bannerSubtext = isOverallHealthy
    ? 'Tüm sistemler normal operasyonel sınırda'
    : `${downServices} kesinti, ${stoppedContainers.length} durmuş konteyner, ${sslWarningCount} SSL uyarısı`;

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {/* 1. Başlık & Hızlı İşlemler */}
      <DashboardHeader
        subtitle={
          isOverallHealthy
            ? 'Sistem telemetrisi ve anlık operasyonel durum'
            : `${totalIssues} servis veya konteyner dikkat gerektiriyor`
        }
        memoryUsageMb={28}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
        onNavigate={onNavigate}
      />

      {/* Hata Uyarısı */}
      {error && (
        <div className="p-3.5 rounded-[16px] bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t('common.error')}: {error}</span>
        </div>
      )}

      {/* 2. Sistem Durum Banner'ı */}
      <SystemBanner
        status={bannerStatus}
        message={bannerMessage}
        subtext={bannerSubtext}
        lastCheckText="son kontrol az önce"
      />

      {/* 3. KPI İstatistik Şeridi + Disk Durumu */}
      <DashboardKpis
        summary={summary}
        metrics={summary?.latestMetrics}
        onNavigate={onNavigate}
      />

      {/* 4. Dikkat Gerektiren Kritik Olaylar */}
      <AttentionAlerts
        services={services}
        stoppedContainers={stoppedContainers}
        failedPushMonitors={failedPushMonitors}
        onNavigate={onNavigate}
      />

      {/* 5. Docker Konteynerleri Genel Bakış */}
      <DockerOverviewSection
        containers={containers}
        onNavigate={onNavigate}
      />

      {/* 6. En Çok Kaynak Kullananlar & Son Olaylar İkili Bölüm */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
        <TopResourcesCard
          containers={containers}
          statsMap={containerStats}
        />
        <RecentEventsCard
          services={services}
          containers={containers}
          lastBackup={summary?.lastBackup}
          liveEvents={liveEvents}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
