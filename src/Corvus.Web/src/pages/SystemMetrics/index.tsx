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
    }, 15000);

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
    { id: '1h', label: t('metrics.range1h') || '1 Saat' },
    { id: '6h', label: t('metrics.range6h') || '6 Saat' },
    { id: '12h', label: t('metrics.range12h') || '12 Saat' },
    { id: '24h', label: t('metrics.range24h') || '24 Saat' },
    { id: '7d', label: t('metrics.range7d') || '7 Gün' },
    { id: '30d', label: t('metrics.range30d') || '30 Gün' },
    { id: '90d', label: t('metrics.range90d') || '90 Gün' },
    { id: '1y', label: t('metrics.range1y') || '1 Yıl' }
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
    <div className="space-y-3 sm:space-y-4 animate-rv">
      {/* Başlık ve Zaman Aralığı Seçici */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#eceef6]">
              {t('metrics.title') || 'Sistem Metrikleri'}
            </h1>
            <span className="font-mono font-semibold text-[11px] px-2.5 py-0.5 rounded-[12px] bg-emerald-400/15 text-[#34d399] inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-dot-pulse" />
              <span>15s</span>
            </span>
          </div>
          <p className="text-[13px] text-[#9ba0b5] mt-0.5">
            {t('metrics.subtitle') || 'Zaman serisi sistem kaynağı tüketim grafikleri'}
          </p>
        </div>

        {/* Range Segment */}
        <div className="glass rounded-[19px] p-[3px] flex gap-0.5 overflow-x-auto max-w-full">
          {ranges.map((r) => {
            const isActive = range === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[16px] transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs'
                    : 'text-[#9ba0b5] hover:text-[#eceef6]'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && metrics.length === 0 && (
        <div className="surface rounded-[22px] p-12 flex flex-col items-center justify-center text-[#9ba0b5] gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#d5d5dc]" />
          <span className="text-xs font-mono">{t('common.loading') || 'Veriler yükleniyor...'}</span>
        </div>
      )}

      {/* 1. Üst KPI Özet Kartları (CPU, RAM, Disk) */}
      <SystemKpiCards metrics={metrics} latestMetric={latest} />

      {/* 2. CPU ve RAM Grafikleri Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5">
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
