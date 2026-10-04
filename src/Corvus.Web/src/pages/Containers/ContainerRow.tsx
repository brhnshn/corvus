import React from 'react';
import { 
  Play, 
  Square, 
  RotateCw, 
  MoreHorizontal, 
  ArrowDownRight, 
  ArrowUpRight 
} from 'lucide-react';
import type { DockerContainer, ContainerStats } from '../../types';
import { Pill, type StatusType } from '../../components/ui/Pill';
import { TagChip } from '../../components/ui/TagChip';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Button } from '../../components/ui/Button';
import { formatBytes } from '../../utils/format';

export interface ContainerRowProps {
  container: DockerContainer;
  stats?: ContainerStats;
  actionInProgress?: boolean;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onOpenSheet: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer) => void;
  onSelectTag?: (tag: string) => void;
  isAdmin?: boolean;
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
}) => {
  const rawName = container.Names?.[0] || container.Id.slice(0, 12);
  const cleanName = rawName.replace(/^\//, '');
  const shortId = container.Id.slice(0, 12);

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

  return (
    <div
      className="
        surface rounded-[20px] p-3.5 sm:p-4 transition-all duration-200 select-none hover:bg-white/[0.10] animate-rv
        flex flex-col gap-3
        lg:grid lg:grid-cols-[2.1fr_1.7fr_1.8fr_1.1fr_190px] lg:items-center lg:gap-4 lg:py-3 lg:px-4.5
      "
    >
      {/* 1. İsim & ID & Etiketler */}
      <div className="flex items-start gap-3 min-w-0">
        <span
          className={`
            w-2.5 h-2.5 rounded-full mt-1.5 shrink-0
            ${isRunning ? 'bg-[#34d399] animate-dot-pulse' : isPaused ? 'bg-[#fbbf24]' : 'bg-[#f87171]'}
          `}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b
              onClick={() => onInspect?.(container)}
              className="text-[14px] sm:text-[15px] font-semibold text-[#eceef6] hover:text-[#d5d5dc] cursor-pointer truncate leading-snug"
              title={cleanName}
            >
              {cleanName}
            </b>
          </div>
          <small className="font-mono text-[11px] text-[#9ba0b5] block truncate mt-0.5">
            {shortId}
          </small>

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
        <span className="font-mono text-[11.5px] text-[#9ba0b5] truncate block" title={container.Image}>
          {container.Image}
        </span>
        {container.Ports && container.Ports.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {container.Ports.map((p, i) => (
              <span
                key={i}
                className="font-mono text-[10.5px] px-2 py-0.5 rounded-[7px] bg-white/[0.08] border border-white/10 text-[#eceef6]"
              >
                {p.PublicPort ? `${p.PublicPort}:` : ''}{p.PrivatePort}
              </span>
            ))}
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
      <div className="flex items-center justify-end gap-1.5 border-t border-white/10 pt-2 lg:border-t-0 lg:pt-0">
        {isAdmin && (
          <>
            {isRunning ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onAction('stop', container.Id, cleanName)}
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
                onClick={() => onAction('start', container.Id, cleanName)}
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
              onClick={() => onAction('restart', container.Id, cleanName)}
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
          onClick={() => onOpenSheet(container)}
          icon={<MoreHorizontal className="w-4 h-4" />}
          title="İşlemler"
          aria-label="İşlemler"
        />
      </div>
    </div>
  );
};
