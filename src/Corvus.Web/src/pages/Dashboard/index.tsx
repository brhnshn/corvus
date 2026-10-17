import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  api, 
  invalidateCache,
  type DashboardSummary, 
  type Service, 
  type PushMonitor, 
  type DockerContainer,
  type ContainerStats,
} from '../../api/client';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../i18n';

// Modüler Alt Bileşenler (ObsidianUI & Clean Architecture)
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { useSystemMetricsStream } from '../../hooks';
import { DashboardHeader } from './DashboardHeader';
import { SystemBanner } from './SystemBanner';
import { DashboardKpis } from './DashboardKpis';
import { AttentionAlerts } from './AttentionAlerts';
import { DockerOverviewSection } from './DockerOverviewSection';
import { TopResourcesCard } from './TopResourcesCard';
import { RecentEventsCard, type EventItem } from './RecentEventsCard';

export interface DashboardPageProps {
  onNavigate?: (page: 'services' | 'containers' | 'metrics' | 'uptime' | 'settings' | 'activity') => void;
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
  const [error, setError] = useState<string | null>(null);
  const [activeSystemName, setActiveSystemName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_name') : null) || 'Host';
  });
  const isMountedRef = useRef(true);

  // Canlı SSE Telemetri Akışı
  const { latestMetric: streamMetric } = useSystemMetricsStream();

  const loadStats = useCallback(async () => {
    try {
      const stats = await api.getContainersStatsSummary();
      if (isMountedRef.current) {
        setContainerStats(stats);
      }
    } catch {
      // Arka plan konteyner kaynak istatistiği hatası ana sayfayı düşürmez
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      // 1. Ana metrikleri ve listeleri paralel çek (hızlı render)
      const [sumData, srvData, pmData, cntData] = await Promise.allSettled([
        api.getDashboardSummary(),
        api.getServices(),
        api.getPushMonitors(),
        api.getContainers(),
      ]);

      if (!isMountedRef.current) return;

      if (sumData.status === 'fulfilled') setSummary(sumData.value);
      if (srvData.status === 'fulfilled') setServices(srvData.value);
      if (pmData.status === 'fulfilled') setPushMonitors(pmData.value);
      if (cntData.status === 'fulfilled') setContainers(cntData.value);

      setError(null);
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : t('dashboard.loadFailed'));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }

    // 2. CPU/RAM yoğun konteyner istatistiklerini ana render'ı bekletmeden paralel getir
    loadStats();
  }, [loadStats, t]);

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

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleCorvusEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const detail = customEvent.detail;
        const newEvent: EventItem = {
          id: String(Date.now()),
          status: detail.type?.includes('error') || detail.type?.includes('down') ? 'err' : 'ok',
          title: detail.message || detail.title || t('dashboard.systemEventDetected'),
          timeAgo: t('dashboard.justNow'),
        };
        setLiveEvents((prev) => [newEvent, ...prev].slice(0, 5));
      }
      if (isMountedRef.current && !document.hidden) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (isMountedRef.current && !document.hidden) {
            loadData();
          }
        }, 1500);
      }
    };

    const handleSystemChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.systemName) {
        setActiveSystemName(customEvent.detail.systemName);
      } else {
        const savedName = localStorage.getItem('corvus_active_system_name') || 'Host';
        setActiveSystemName(savedName);
      }
      invalidateCache();
      if (isMountedRef.current) {
        loadData();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('corvus_event', handleCorvusEvent);
    window.addEventListener('corvus_active_system_changed', handleSystemChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_event', handleCorvusEvent);
      window.removeEventListener('corvus_active_system_changed', handleSystemChange);
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
    ? t('dashboard.allServicesHealthy', { count: healthyServices, total: totalServices })
    : t('dashboard.itemsNeedAttention', { count: totalIssues });

  const bannerSubtext = isOverallHealthy
    ? t('dashboard.allSystemsNormal')
    : t('dashboard.issuesSummary', { down: downServices, stopped: stoppedContainers.length, ssl: sslWarningCount });

  return (
    <PageStage className="space-y-4">
      {/* 1. Başlık & Hızlı İşlemler */}
      <MotionItem staggerIndex={0}>
        <DashboardHeader
          subtitle={
            isOverallHealthy
              ? t('dashboard.allOperationalDesc')
              : `${totalIssues} ${t('dashboard.attentionIssues')}`
          }
          systemName={activeSystemName}
          onNavigate={onNavigate}
        />
      </MotionItem>

      {/* Hata Uyarısı */}
      {error && (
        <MotionItem staggerIndex={1}>
          <div className="p-3.5 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[rgba(229,83,75,0.3)] text-[var(--status-down)] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t('common.error')}: {error}</span>
          </div>
        </MotionItem>
      )}

      {/* 2. Sistem Durum Banner'ı */}
      <MotionItem staggerIndex={1}>
        <SystemBanner
          status={bannerStatus}
          message={bannerMessage}
          subtext={bannerSubtext}
          onNavigate={onNavigate}
        />
      </MotionItem>

      {/* 3. KPI İstatistik Şeridi + Disk Durumu */}
      <MotionItem staggerIndex={2}>
        <DashboardKpis
          summary={summary}
          metrics={streamMetric || summary?.latestMetrics}
          onNavigate={onNavigate}
        />
      </MotionItem>

      {/* 4. Dikkat Gerektiren Kritik Olaylar */}
      <MotionItem staggerIndex={3}>
        <AttentionAlerts
          services={services}
          stoppedContainers={stoppedContainers}
          failedPushMonitors={failedPushMonitors}
          onNavigate={onNavigate}
        />
      </MotionItem>

      {/* 5. Docker Konteynerleri Genel Bakış */}
      <MotionItem staggerIndex={4}>
        <DockerOverviewSection
          containers={containers}
          onNavigate={onNavigate}
        />
      </MotionItem>

      {/* 6. En Çok Kaynak Kullananlar & Son Olaylar İkili Bölüm */}
      <MotionItem staggerIndex={5}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <TopResourcesCard
            containers={containers}
            statsMap={containerStats}
            onNavigate={onNavigate ? () => onNavigate('containers') : undefined}
          />
          <RecentEventsCard
            services={services}
            containers={containers}
            lastBackup={summary?.lastBackup}
            liveEvents={liveEvents}
            onNavigate={onNavigate ? () => onNavigate('activity') : undefined}
          />
        </div>
      </MotionItem>
    </PageStage>
  );
};

export default DashboardPage;
