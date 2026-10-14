import React from 'react';
import type { UptimeCheckItem } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { UptimeStrip, type UptimeSegment } from '../../components/ui/UptimeStrip';

interface UptimeBarProps {
  checks: UptimeCheckItem[];
  maxBlocks?: number;
}

interface BucketData {
  status: 'up' | 'down' | 'warn' | 'muted';
  count: number;
  upCount: number;
  avgResponseMs: number;
  label: string;
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ checks, maxBlocks = 45 }) => {
  if (checks.length === 0) {
    return (
      <Card className="space-y-2">
        <UptimeStrip count={maxBlocks} />
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono px-0.5">
          <span>Veri toplanıyor...</span>
          <span>Şimdi</span>
        </div>
      </Card>
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

    let status: BucketData['status'] = 'muted';
    if (chunk.length > 0) {
      if (upCount === chunk.length) {
        status = 'up';
      } else if (upCount === 0) {
        status = 'down';
      } else {
        status = 'warn';
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
      status: 'muted',
      count: 0,
      upCount: 0,
      avgResponseMs: 0,
      label: 'Önceki dönem'
    });
  }

  const firstDate = new Date(checks[0].checkedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const lastDate = new Date(checks[checks.length - 1].checkedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

  const segments: UptimeSegment[] = buckets.map((b) => ({
    status: b.status,
    tooltip: b.label,
    latency: b.avgResponseMs,
  }));

  return (
    <Card className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-[var(--cloud-100)] font-semibold mb-1">
        <span>Erişilebilirlik ve Yanıt Süresi Geçmişi</span>
        <span className="font-mono text-[11px] text-[var(--text-muted)]">Son 45 Kontrol</span>
      </div>

      <UptimeStrip segments={segments} count={maxBlocks} height={24} />

      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono px-0.5 pt-1">
        <span>{firstDate}</span>
        <span className="text-[var(--text-muted)] opacity-60">Kronolojik Telemetri</span>
        <span>{lastDate} (Şimdi)</span>
      </div>
    </Card>
  );
};

