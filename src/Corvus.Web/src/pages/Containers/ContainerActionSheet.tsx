import React from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Pill, type StatusType } from '../../components/ui/Pill';
import { 
  FileText, 
  Terminal, 
  Sliders, 
  Tag, 
  Play, 
  Square, 
  RotateCw, 
  Pause,
  ArrowUpRight
} from 'lucide-react';
import type { DockerContainer } from '../../types';

export interface ContainerActionSheetProps {
  container: DockerContainer | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart', id: string, name: string) => void;
  onOpenLogs: (id: string, name: string) => void;
  onOpenTerminal?: (id: string, name: string) => void;
  onEditTags?: (container: DockerContainer) => void;
  onInspect?: (container: DockerContainer) => void;
  isAdmin?: boolean;
}

export const ContainerActionSheet: React.FC<ContainerActionSheetProps> = ({
  container,
  isOpen,
  onClose,
  onAction,
  onOpenLogs,
  onOpenTerminal,
  onEditTags,
  onInspect,
  isAdmin = true,
}) => {
  if (!container) return null;

  const rawName = container.Names?.[0] || container.Id.slice(0, 12);
  const cleanName = rawName.replace(/^\//, '');
  const shortId = container.Id.slice(0, 12);
  const state = container.State.toLowerCase();
  const isRunning = state === 'running';
  const isPaused = state === 'paused';

  const statusType: StatusType = isRunning ? 'ok' : isPaused ? 'warn' : 'err';
  const statusLabel = isRunning ? 'Çalışıyor' : isPaused ? 'Duraklatıldı' : 'Durdu';

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-[17px] font-bold text-[#eceef6]">{cleanName}</span>
          <span className="font-mono text-xs text-[#9ba0b5]">({shortId})</span>
          <Pill status={statusType} label={statusLabel} />
        </div>
      }
      subtitle={
        <span className="font-mono text-xs text-[#9ba0b5] truncate block mt-0.5" title={container.Image}>
          {container.Image}
        </span>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Grup 1: İnceleme & Gelişmiş Araçlar */}
        <div>
          <div className="text-[11px] font-semibold text-[#9ba0b5] uppercase tracking-wider mb-2 px-1">
            İnceleme & Araçlar
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Günlükler */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogs(container.Id, cleanName);
              }}
              className="group flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.12] flex items-center justify-center shrink-0 text-[#eceef6] transition-colors">
                <FileText className="w-4 h-4 text-[#d5d5dc]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[#eceef6] flex items-center justify-between">
                  <span>Canlı Günlükler</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#9ba0b5] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11.5px] text-[#9ba0b5] mt-0.5 line-clamp-1">
                  stdout/stderr kayıtlarını gerçek zamanlı izleyin
                </p>
              </div>
            </button>

            {/* Terminal */}
            {onOpenTerminal && (
              <button
                type="button"
                disabled={!isRunning || !isAdmin}
                onClick={() => {
                  onClose();
                  onOpenTerminal(container.Id, cleanName);
                }}
                className={`group flex items-start gap-3 p-3.5 rounded-2xl border transition-all text-left ${
                  isRunning && isAdmin
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 hover:border-white/20 cursor-pointer'
                    : 'bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#eceef6] flex items-center justify-between">
                    <span>Web Terminal</span>
                    {isRunning && isAdmin && (
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#9ba0b5] opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="text-[11.5px] text-[#9ba0b5] mt-0.5 line-clamp-1">
                    {isRunning 
                      ? (isAdmin ? 'Konteyner içinde etkileşimli kabuk aç' : 'Yalnızca yönetici erişebilir')
                      : 'Konteyner çalışırken kullanılabilir'}
                  </p>
                </div>
              </button>
            )}

            {/* Detay & Yapılandırma */}
            {onInspect && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onInspect(container);
                }}
                className="group flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.12] flex items-center justify-center shrink-0 text-[#eceef6] transition-colors">
                  <Sliders className="w-4 h-4 text-[#d5d5dc]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#eceef6] flex items-center justify-between">
                    <span>Detay & Canlı Yapılandırma</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#9ba0b5] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11.5px] text-[#9ba0b5] mt-0.5 line-clamp-1">
                    Portlar, ortam değişkenleri ve CPU/RAM sınırları
                  </p>
                </div>
              </button>
            )}

            {/* Etiketleri Düzenle */}
            {isAdmin && onEditTags && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditTags(container);
                }}
                className="group flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-white/[0.06] group-hover:bg-white/[0.12] flex items-center justify-center shrink-0 text-[#eceef6] transition-colors">
                  <Tag className="w-4 h-4 text-[#d5d5dc]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[#eceef6] flex items-center justify-between">
                    <span>Etiketleri Yönet</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#9ba0b5] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[11.5px] text-[#9ba0b5] mt-0.5 line-clamp-1">
                    Filtreleme ve akıllı gruplama etiketleri
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Grup 2: Yaşam Döngüsü Kontrolleri */}
        {isAdmin && (
          <div>
            <div className="text-[11px] font-semibold text-[#9ba0b5] uppercase tracking-wider mb-2 px-1">
              Yaşam Döngüsü Eylemleri
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {/* Yeniden Başlat */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAction('restart', container.Id, cleanName);
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-[#eceef6] hover:text-white transition-all cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#9ba0b5]" />
                <span>Yeniden Başlat</span>
              </button>

              {/* Duraklat / Devam Et */}
              {isRunning && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAction('pause', container.Id, cleanName);
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-xs font-semibold text-[#fbbf24] transition-all cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Duraklat</span>
                </button>
              )}

              {isPaused && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAction('unpause', container.Id, cleanName);
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-xs font-semibold text-[#34d399] transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Devam Ettir</span>
                </button>
              )}

              {/* Başlat / Durdur */}
              {isRunning ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAction('stop', container.Id, cleanName);
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-semibold text-[#f87171] transition-all cursor-pointer col-span-2 sm:col-span-1"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Durdur</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAction('start', container.Id, cleanName);
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-xs font-semibold text-[#34d399] transition-all cursor-pointer col-span-2 sm:col-span-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Başlat</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};

