import React, { useEffect, useState } from 'react';
import { api, type SystemMetric } from '../../api/client';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';
import { SystemKpiCards } from './SystemKpiCards';
import { CpuMetricsChart } from './CpuMetricsChart';
import { RamMetricsChart } from './RamMetricsChart';
import { DiskStorageCard } from './DiskStorageCard';

export const SystemMetricsPage: React.FC = () => {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    const interval = setInterval(() => {
      if (!document.hidden && isMountedRef.current) loadData();
    }, 25000);

    const onVisible = () => {
      if (!document.hidden && isMountedRef.current) loadData();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadData]);

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

  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Header and Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#e5e7eb]">{t('metrics.title')}</h1>
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>15s</span>
            </span>
          </div>
          <p className="text-sm text-[#9ca3af]">{t('metrics.subtitle')}</p>
        </div>

        {/* Range Buttons */}
        <div className="flex items-center gap-1 bg-[#1a1d29] p-1 rounded-xl border border-[#2a2e3f] overflow-x-auto max-w-full">
          {ranges.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 cursor-pointer ${
                range === r.id
                  ? 'bg-[#d4d4d8] text-[#0f1117] font-semibold shadow-xs'
                  : 'text-[#9ca3af] hover:text-[#e5e7eb]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && metrics.length === 0 && (
        <div className="flex items-center justify-center h-64 text-[#9ca3af]">
          <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-400" />
          {t('common.loading')}
        </div>
      )}

      {/* 1. Üst KPI Özet Kartları (CPU, RAM, Disk) */}
      <SystemKpiCards metrics={metrics} latestMetric={latest} />

      {/* 2. CPU ve RAM Grafikleri Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* 3. Disk Depolama Durumu Kartı */}
      {latest && (
        <DiskStorageCard 
          diskUsedGb={latest.diskUsedGb} 
          diskTotalGb={latest.diskTotalGb} 
        />
      )}
    </div>
  );
};

export default SystemMetricsPage;
