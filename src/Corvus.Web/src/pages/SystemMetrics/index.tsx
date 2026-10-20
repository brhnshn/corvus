import React, { useEffect, useState } from 'react';
import { api, type SystemMetric } from '../../api/client';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { StatusDot } from '../../components/ui/StatusDot';
import { useSystemMetricsStream } from '../../hooks';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import { SystemKpiCards } from './SystemKpiCards';
import { CpuMetricsChart } from './CpuMetricsChart';
import { RamMetricsChart } from './RamMetricsChart';
import { DiskStorageCard } from './DiskStorageCard';

export const SystemMetricsPage: React.FC = () => {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  const [activeSystemName, setActiveSystemName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_name') : null) || 'Host';
  });
  const [activeSystemId, setActiveSystemId] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_id') : null) || 'local-host';
  });

  // Canlı SSE Telemetri Akışı (100ms Sync - scoped to active system)
  const { latestMetric: streamMetric, isConnected: isLiveStream } = useSystemMetricsStream(activeSystemId);

  const isMountedRef = React.useRef(true);

  const loadData = React.useCallback(async () => {
    try {
      const data = await api.getSystemMetrics(range);
      if (isMountedRef.current) setMetrics(data);
    } catch (err) {
      if (isMountedRef.current) console.error('Metrikler yüklenemedi:', err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [range]);

  useLoadEffect(loadData);

  useEffect(() => {
    isMountedRef.current = true;

    // SSE bağlıysa periyodik polling aralığını gevşet (60s), bağlı değilse 15s fallback
    const pollIntervalMs = isLiveStream ? 60000 : 15000;
    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadData();
    }, pollIntervalMs);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadData();
    };
    document.addEventListener('visibilitychange', onVisible);

    const handleSystemChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const sId = customEvent.detail?.systemId || localStorage.getItem('corvus_active_system_id') || 'local-host';
      const sName = customEvent.detail?.systemName || localStorage.getItem('corvus_active_system_name') || 'Host';
      setActiveSystemId(sId);
      setActiveSystemName(sName);
      if (isMountedRef.current) {
        loadData();
      }
    };
    window.addEventListener('corvus_active_system_changed', handleSystemChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('corvus_active_system_changed', handleSystemChange);
    };
  }, [loadData, isLiveStream]);

  const ranges = [
    { id: '1h', label: t('metrics.range1h') },
    { id: '6h', label: t('metrics.range6h') },
    { id: '12h', label: t('metrics.range12h') },
    { id: '24h', label: t('metrics.range24h') },
    { id: '7d', label: t('metrics.range7d') },
    { id: '30d', label: t('metrics.range30d') },
    { id: '90d', label: t('metrics.range90d') },
    { id: '1y', label: t('metrics.range1y') }
  ];

  const isMultiDay = range === '24h' || range === '7d' || range === '30d' || range === '90d' || range === '1y';

  const chartData = metrics.map((m) => {
    const d = new Date(m.recordedAt);
    const time = (range === '90d' || range === '1y')
      ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : isMultiDay
      ? `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      time,
      fullTime: d.toLocaleString(),
      cpu: m.cpuPercent,
      ramPercent: Math.round((m.ramUsedMb / m.ramTotalMb) * 100),
      ramUsedGb: +(m.ramUsedMb / 1024).toFixed(2),
      ramTotalGb: +(m.ramTotalMb / 1024).toFixed(2)
    };
  });

  const latest = streamMetric || (metrics.length > 0 ? metrics[metrics.length - 1] : null);

  return (
    <PageStage className="space-y-4">
      {/* Başlık ve Zaman Aralığı Seçici */}
      <MotionItem staggerIndex={0}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--cloud-100)] flex items-center gap-2">
                <span>{t('metrics.title')}</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--bg-card)] border border-[var(--border-hairline)] text-[var(--cloud-200)] shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cloud-400)]" />
                  {activeSystemName}
                </span>
              </h1>
              <span className="badge flex items-center gap-1.5 px-2 py-0.5 text-xs">
                <StatusDot status={isLiveStream ? "up" : "warn"} />
                <span className="font-mono text-[11px] text-[var(--cloud-200)]">
                  {isLiveStream ? t('metrics.liveSync') : '15s'}
                </span>
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-0.5">
              {t('metrics.subtitle')}
            </p>
          </div>

          {/* Range Tabs (ObsidianUI sliding pill tabs) */}
          <div className="tabs">
            {ranges.map((r) => {
              const isActive = range === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={`tab ${isActive ? 'active' : ''}`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </MotionItem>

      {loading && metrics.length === 0 && (
        <div className="card p-12 flex flex-col items-center justify-center text-[var(--text-muted)] gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--cloud-200)]" />
          <span className="text-xs font-mono">{t('common.loading')}</span>
        </div>
      )}

      {/* 1. Üst KPI Özet Kartları (CPU, RAM, Disk) */}
      <MotionItem staggerIndex={1}>
        <SystemKpiCards metrics={metrics} latestMetric={latest} />
      </MotionItem>

      {/* 2. CPU ve RAM Grafikleri Grid */}
      <MotionItem staggerIndex={2}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <CpuMetricsChart 
            data={chartData} 
            currentCpu={latest ? latest.cpuPercent : 0} 
          />
          <RamMetricsChart 
            data={chartData} 
            currentRamGb={latest ? +(latest.ramUsedMb / 1024).toFixed(1) : 0} 
            totalRamGb={latest ? +(latest.ramTotalMb / 1024).toFixed(1) : 0} 
          />
        </div>
      </MotionItem>

      {/* 3. Disk Depolama Durumu Kartı */}
      {latest && (
        <MotionItem staggerIndex={3}>
          <DiskStorageCard 
            diskUsedGb={latest.diskUsedGb} 
            diskTotalGb={latest.diskTotalGb} 
          />
        </MotionItem>
      )}
    </PageStage>
  );
};
