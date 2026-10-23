import React from 'react';
import { useI18n } from '../../../i18n';
import { Cpu, HardDrive, ArrowDownUp, Sliders } from 'lucide-react';
import { formatBytes } from '../../../utils/format';
import type { ContainerStats } from '../../../types';
import { getCpuBarColor, getMemoryBarColor, clampPercent } from './resources.utils';

interface ResourcesTelemetrySectionProps {
  isRunning: boolean;
  isAdmin: boolean;
  stats: ContainerStats | null;
  initialNanoCpus: number;
  initialMemoryBytes: number;
  onEditLimits: () => void;
}

export const ResourcesTelemetrySection: React.FC<ResourcesTelemetrySectionProps> = ({
  isRunning,
  isAdmin,
  stats,
  initialNanoCpus,
  initialMemoryBytes,
  onEditLimits
}) => {
  const { t } = useI18n();

  const cpuBarColor = getCpuBarColor(stats?.cpuPercent || 0);
  const memBarColor = getMemoryBarColor(stats?.memoryPercent || 0);

  return (
    <>
      {/* Başlık ve Canlı Durum Rozeti */}
      <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[var(--text-primary)]">
              {t('containers.tabResources')} & {t('containers.tabTelemetryLive')}
            </h4>
            {isRunning ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t('containers.liveDataBadge', { interval: '2.5s' })}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {t('containers.containerStoppedBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {t('containers.resourcesSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Canlı Trafik Özet Rozeti */}
          {isRunning && stats && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-[var(--border-hairline)] text-[11px] font-mono shrink-0">
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                <ArrowDownUp className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('containers.networkBadge')}</span>
              </div>
              <span className="text-emerald-400 font-medium">↓ {formatBytes(stats.networkRxBytes)}</span>
              <span className="text-sky-400 font-medium">↑ {formatBytes(stats.networkTxBytes)}</span>
            </div>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={onEditLimits}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--border-hairline)] text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('containers.editResourceLimitsBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* CANLI PERFORMANS KARTLARI (GERÇEK VERİLER) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CPU Canlı Telemetri Kartı */}
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {t('containers.liveCpuUsage')}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
              {isRunning && typeof stats?.cpuPercent === 'number' ? `${stats.cpuPercent.toFixed(1)}%` : '-'}
            </span>
          </div>

          {/* Dinamik CPU İlerleme Çubuğu */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${cpuBarColor}`}
              style={{ width: `${clampPercent(stats?.cpuPercent || 0)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{t('containers.activeLimit')}</span>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {initialNanoCpus > 0
                ? `${(initialNanoCpus / 1_000_000_000).toFixed(1)} ${t('containers.coresUnit')}`
                : t('containers.allHostCores')}
            </span>
          </div>
        </div>

        {/* Bellek (RAM) Canlı Telemetri Kartı */}
        <div className="p-4 surface border border-[var(--border-hairline)] rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {t('containers.liveMemoryUsage')}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
              {isRunning && stats && typeof stats.memoryUsageBytes === 'number'
                ? `${formatBytes(stats.memoryUsageBytes)} (${stats.memoryPercent.toFixed(1)}%)`
                : '-'}
            </span>
          </div>

          {/* Dinamik RAM İlerleme Çubuğu */}
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${memBarColor}`}
              style={{ width: `${clampPercent(stats?.memoryPercent || 0)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span>{initialMemoryBytes > 0 ? t('containers.configuredLimit') : t('containers.hostTotalRam')}</span>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {initialMemoryBytes > 0
                ? formatBytes(initialMemoryBytes)
                : stats?.memoryLimitBytes
                  ? `${formatBytes(stats.memoryLimitBytes)} (${t('containers.unlimited')})`
                  : t('containers.unlimited')}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
