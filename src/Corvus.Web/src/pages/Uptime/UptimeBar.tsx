import React from 'react';
import type { UptimeCheckItem } from '../../api/client';

interface UptimeBarProps {
  checks: UptimeCheckItem[];
  maxBlocks?: number;
}

interface BucketData {
  status: 'up' | 'down' | 'degraded' | 'empty';
  count: number;
  upCount: number;
  avgResponseMs: number;
  label: string;
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ checks, maxBlocks = 45 }) => {
  if (checks.length === 0) {
    return (
      <div className="surface rounded-[22px] p-4 sm:p-5 space-y-2">
        <div className="flex gap-1 py-1">
          {Array.from({ length: maxBlocks }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-8 rounded-[3px] bg-white/[0.06] transition-colors"
              title="Veri yok"
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#9ba0b5] font-mono px-0.5">
          <span>Veri toplanıyor...</span>
          <span>Şimdi</span>
        </div>
      </div>
    );
  }

  // Kontrolleri kronolojik olarak bloklara (buckets) böl
  const buckets: BucketData[] = [];
  const chunkSize = Math.max(1, Math.ceil(checks.length / maxBlocks));

  for (let i = 0; i < checks.length; i += chunkSize) {
    const chunk = checks.slice(i, i + chunkSize);
    const upCount = chunk.filter((c) => c.status === 'up').length;
    const totalMs = chunk.reduce((acc, c) => acc + (c.responseTimeMs || 0), 0);
    const avgMs = chunk.length > 0 ? Math.round(totalMs / chunk.length) : 0;

    let status: BucketData['status'] = 'empty';
    if (chunk.length > 0) {
      if (upCount === chunk.length) {
        status = 'up';
      } else if (upCount === 0) {
        status = 'down';
      } else {
        status = 'degraded';
      }
    }

    const firstTime = new Date(chunk[0].checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const lastTime = new Date(chunk[chunk.length - 1].checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const label = `${firstTime} - ${lastTime} (${upCount}/${chunk.length} Başarılı, ${avgMs}ms)`;

    buckets.push({
      status,
      count: chunk.length,
      upCount,
      avgResponseMs: avgMs,
      label
    });
  }

  // Eksik blokları baştan tamamla (total maxBlocks olsun)
  while (buckets.length < maxBlocks) {
    buckets.unshift({
      status: 'empty',
      count: 0,
      upCount: 0,
      avgResponseMs: 0,
      label: 'Önceki dönem'
    });
  }

  const firstDate = new Date(checks[0].checkedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const lastDate = new Date(checks[checks.length - 1].checkedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="surface rounded-[22px] p-4 sm:p-5 space-y-2.5">
      <div className="flex items-center gap-1 py-1">
        {buckets.map((b, idx) => {
          let bgClass = 'bg-white/[0.06]';
          if (b.status === 'up') bgClass = 'bg-[#34d399] hover:brightness-110';
          else if (b.status === 'down') bgClass = 'bg-[#f87171] hover:brightness-110';
          else if (b.status === 'degraded') bgClass = 'bg-[#fbbf24] hover:brightness-110';

          return (
            <div
              key={idx}
              className={`flex-1 h-8 rounded-[3px] transition-all cursor-pointer ${bgClass}`}
              title={b.label}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#9ba0b5] font-mono px-0.5">
        <span>{firstDate}</span>
        <span className="text-white/40">Geçmiş Zaman Çizgisi</span>
        <span>{lastDate} (Şimdi)</span>
      </div>
    </div>
  );
};
