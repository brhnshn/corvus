import React from 'react';
import { 
  Play, 
  Square, 
  RotateCw, 
  MoreHorizontal, 
  ArrowDownRight, 
  ArrowUpRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import type { DockerContainer, ContainerStats } from '../../types';
import { Pill, type StatusType } from '../../components/ui/Pill';
import { TagChip } from '../../components/ui/TagChip';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { formatBytes } from '../../utils/format';
import { ContainerQuickActions } from './ContainerQuickActions';

export interface ContainerRowProps {
  container: DockerContainer;
  stats?: ContainerStats;
  actionInProgress?: boolean;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onOpenSheet: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer, defaultTab?: string) => void;
  onSelectTag?: (tag: string) => void;
  isAdmin?: boolean;
  onOpenImageUpdate?: (container: DockerContainer) => void;
  hasUpdate?: boolean;
}

export function extractContainerTags(labels?: Record<string, string>): string[] {
  if (!labels) return [];
  const tags: string[] = [];
  if (labels['corvus.tags']) {
    tags.push(...labels['corvus.tags'].split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (labels['environment']) tags.push(labels['environment'].trim());
  else if (labels['env']) tags.push(labels['env'].trim());
  if (labels['com.docker.compose.project']) tags.push(labels['com.docker.compose.project'].trim());
  return Array.from(new Set(tags));
}

export const ContainerRow: React.FC<ContainerRowProps> = ({
  container,
  stats,
  actionInProgress = false,
  onAction,
  onOpenSheet,
  onInspect,
  onSelectTag,
  isAdmin = true,
  onOpenImageUpdate,
  hasUpdate = false,
}) => {
  const rawName = container.Names?.[0] || container.Id.slice(0, 12);
  const cleanName = rawName.replace(/^\//, '');
  const shortId = container.Id.slice(0, 12);
  const composeProject = container.Labels?.['com.docker.compose.project'];

  const state = container.State.toLowerCase();
  const isRunning = state === 'running';
  const isPaused = state === 'paused';

  const statusType: StatusType = isRunning ? 'ok' : isPaused ? 'warn' : 'err';
  const statusLabel = isRunning ? 'Çalışıyor' : isPaused ? 'Duraklatıldı' : 'Durdu';

  const containerTags = container.tags && container.tags.length > 0
    ? container.tags
    : extractContainerTags(container.Labels);

  const cpuPercent = stats ? Math.round(stats.cpuPercent) : 0;
  const ramBytes = stats?.memoryUsageBytes ?? 0;
  const ramPercent = stats ? Math.round(stats.memoryPercent) : 0;

  const handleRowClick = () => {
    onInspect?.(container);
  };

  return (
    <div
      onClick={handleRowClick}
      className="
        surface rounded-[20px] p-3.5 sm:p-4 select-none
        cursor-pointer hover:bg-white/[0.08] hover:border-white/15 active:scale-[0.998] transition-all duration-150 animate-rv
        flex flex-col gap-3
        lg:grid lg:grid-cols-[2.1fr_1.5fr_1.8fr_1fr_190px] lg:items-center lg:gap-4 lg:py-3 lg:px-4.5
      "
    >
      {/* 1. İsim & ID & Hızlı Eylemler & Etiketler */}
      <div className="flex items-start gap-3 min-w-0">
        <span
          className={`
            w-2.5 h-2.5 rounded-full mt-1.5 shrink-0
            ${isRunning ? 'bg-[#34d399] animate-dot-pulse' : isPaused ? 'bg-[#fbbf24]' : 'bg-[#f87171]'}
          `}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b
              className="text-[14px] sm:text-[15px] font-semibold text-[#eceef6] hover:text-white truncate leading-snug"
              title={cleanName}
            >
              {cleanName}
            </b>

            {composeProject && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                {composeProject}
              </span>
            )}

            {hasUpdate && onOpenImageUpdate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenImageUpdate(container);
                }}
                title="İmaj Güncellemesi Mevcut"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-500/25 transition-colors cursor-pointer"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>Güncelleme</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <small className="font-mono text-[11px] text-[#9ba0b5] block truncate">
              {shortId}
            </small>

            {/* Doğrudan satır üstünde Portainer tarzı Hızlı Eylemler (Quick Actions) */}
            <div className="hidden sm:inline-block">
              <ContainerQuickActions
                container={container}
                onInspect={onInspect}
                isAdmin={isAdmin}
              />
            </div>
          </div>

          {containerTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {containerTags.map((tag) => (
                <TagChip
                  key={tag}
                  name={tag}
                  onClick={onSelectTag ? () => onSelectTag(tag) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobilde sağ üstte Pill */}
        <div className="lg:hidden shrink-0">
          <Pill status={statusType} label={statusLabel} />
        </div>
      </div>

      {/* 2. Kaynak Kullanımı (CPU & RAM çubukları) */}
      <div className="space-y-1.5 text-xs">
        {isRunning && stats ? (
          <>
            <div>
              <div className="flex justify-between text-[11px] text-[#9ba0b5] mb-1 font-mono">
                <span>CPU: <b className="text-[#eceef6]">{cpuPercent}%</b></span>
                <span>RAM: <b className="text-[#eceef6]">{formatBytes(ramBytes)}</b></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ProgressBar value={cpuPercent} metricType="cpu" height={5} />
                <ProgressBar value={ramPercent} metricType="ram" height={5} />
              </div>
            </div>

            {(stats.networkRxBytes > 0 || stats.networkTxBytes > 0) && (
              <div className="flex items-center gap-2 font-mono text-[10px] text-[#9ba0b5] pt-0.5">
                <span className="flex items-center gap-0.5 text-emerald-400">
                  <ArrowDownRight className="w-3 h-3" />
                  {formatBytes(stats.networkRxBytes)}
                </span>
                <span className="flex items-center gap-0.5 text-indigo-300">
                  <ArrowUpRight className="w-3 h-3" />
                  {formatBytes(stats.networkTxBytes)}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="font-mono text-[11px] text-[#9ba0b5]">
            {isRunning ? 'Telemetri alınıyor…' : 'Konteyner durdurulmuş'}
          </div>
        )}
      </div>

      {/* 3. İmaj & Portlar */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11.5px] text-[#9ba0b5] truncate block flex-1" title={container.Image}>
            {container.Image}
          </span>
          {onOpenImageUpdate && (
            <button
              type="button"
              onClick={() => onOpenImageUpdate(container)}
              title="İmaj sürümünü denetle"
              className="p-1 rounded text-[#9ba0b5] hover:text-emerald-400 hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-3 h-3" />
            </button>
          )}
        </div>
        {container.Ports && container.Ports.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {container.Ports.map((p, i) => {
              const label = p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`;
              const host = window.location.hostname || 'localhost';
              const href = p.PublicPort ? `http://${host}:${p.PublicPort}` : undefined;

              if (href) {
                return (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title={`${label} adresine git`}
                    className="inline-flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-[7px] bg-white/[0.08] hover:bg-white/[0.16] hover:text-white border border-white/10 text-[#eceef6] transition-colors cursor-pointer"
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#9ba0b5]" />
                  </a>
                );
              }

              return (
                <span
                  key={i}
                  className="font-mono text-[10.5px] px-2 py-0.5 rounded-[7px] bg-white/[0.08] border border-white/10 text-[#eceef6]"
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Durum (Masaüstü) */}
      <div className="hidden lg:block min-w-0">
        <Pill status={statusType} label={statusLabel} />
        <small className="font-mono text-[11px] text-[#9ba0b5] block truncate mt-1">
          {container.Status || 'Durum bilinmiyor'}
        </small>
      </div>

      {/* 5. Aksiyon Butonları */}
      <div
        className="flex items-center justify-end gap-1.5 border-t border-white/10 pt-2 lg:border-t-0 lg:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isAdmin && (
          <>
            {isRunning ? (
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e?.stopPropagation();
                  onAction('stop', container.Id, cleanName);
                }}
                disabled={actionInProgress}
                icon={<Square className="w-3.5 h-3.5" />}
                className="flex-1 lg:flex-none"
              >
                Durdur
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e?.stopPropagation();
                  onAction('start', container.Id, cleanName);
                }}
                disabled={actionInProgress}
                icon={<Play className="w-3.5 h-3.5" />}
                className="flex-1 lg:flex-none"
              >
                Başlat
              </Button>
            )}

            <Button
              variant="icon"
              size="sm"
              onClick={(e) => {
                e?.stopPropagation();
                onAction('restart', container.Id, cleanName);
              }}
              disabled={actionInProgress}
              icon={<RotateCw className="w-3.5 h-3.5" />}
              title="Yeniden Başlat"
              aria-label="Yeniden Başlat"
            />
          </>
        )}

        <Button
          variant="icon"
          size="sm"
          onClick={(e) => {
            e?.stopPropagation();
            onOpenSheet(container);
          }}
          icon={<MoreHorizontal className="w-4 h-4" />}
          title="İşlemler"
          aria-label="İşlemler"
        />
      </div>
    </div>
  );
};
