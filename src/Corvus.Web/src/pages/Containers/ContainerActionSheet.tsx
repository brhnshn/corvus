import React from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { 
  FileText, 
  Terminal, 
  Tag, 
  Play, 
  Square, 
  RotateCw, 
  Pause 
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
  isAdmin = true,
}) => {
  if (!container) return null;

  const rawName = container.Names?.[0] || container.Id.slice(0, 12);
  const cleanName = rawName.replace(/^\//, '');
  const shortId = container.Id.slice(0, 12);
  const state = container.State.toLowerCase();
  const isRunning = state === 'running';
  const isPaused = state === 'paused';

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="w-[min(100%,460px)]"
      title={
        <div className="px-1 pt-0.5 pb-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-semibold text-[#eceef6] truncate">
              {cleanName}
            </h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              isRunning ? 'bg-emerald-500/15 text-emerald-400' : isPaused ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
            }`}>
              {isRunning ? 'Çalışıyor' : isPaused ? 'Duraklatıldı' : 'Durdu'}
            </span>
          </div>
          <small className="block text-[11px] text-[#9ba0b5] font-mono font-normal mt-0.5">
            {shortId}
          </small>
        </div>
      }
    >
      <div className="flex flex-col gap-0.5 pt-1">
        {/* Loglar */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenLogs(container.Id, cleanName);
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-[15px] font-medium text-[#eceef6] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-left"
        >
          <FileText className="w-[18px] h-[18px] text-[#9ba0b5] shrink-0" />
          <span>Loglar</span>
        </button>

        {/* Terminal */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenTerminal?.(container.Id, cleanName);
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-[15px] font-medium text-[#eceef6] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-left"
        >
          <Terminal className="w-[18px] h-[18px] text-[#9ba0b5] shrink-0" />
          <span>Terminal</span>
        </button>


        {/* Etiket ekle */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onEditTags?.(container);
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-[15px] font-medium text-[#eceef6] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-left"
        >
          <Tag className="w-[18px] h-[18px] text-[#9ba0b5] shrink-0" />
          <span>Etiket ekle</span>
        </button>

        {/* Yeniden Başlat */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onAction('restart', container.Id, cleanName);
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-[15px] font-medium text-[#eceef6] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-left"
          >
            <RotateCw className="w-[18px] h-[18px] text-[#9ba0b5] shrink-0" />
            <span>Yeniden Başlat</span>
          </button>
        )}

        {/* Duraklat / Devam ettir */}
        {isAdmin && (isRunning || isPaused) && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onAction(isPaused ? 'unpause' : 'pause', container.Id, cleanName);
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-[15px] font-medium text-[#eceef6] hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors cursor-pointer text-left"
          >
            {isPaused ? (
              <>
                <Play className="w-[18px] h-[18px] text-amber-400 shrink-0" />
                <span>Devam ettir</span>
              </>
            ) : (
              <>
                <Pause className="w-[18px] h-[18px] text-[#9ba0b5] shrink-0" />
                <span>Duraklat</span>
              </>
            )}
          </button>
        )}

        {/* Durdur / Başlat (Tehlikeli eylem / Durdurma: kırmızı mi dg) */}
        {isAdmin && (
          isRunning ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAction('stop', container.Id, cleanName);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-[15px] font-medium text-[#f87171] hover:bg-rose-500/10 active:bg-rose-500/15 transition-colors cursor-pointer text-left"
            >
              <Square className="w-[18px] h-[18px] text-[#f87171] shrink-0" />
              <span>Durdur</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onAction('start', container.Id, cleanName);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-[14px] text-[15px] font-medium text-emerald-400 hover:bg-emerald-500/10 active:bg-emerald-500/15 transition-colors cursor-pointer text-left"
            >
              <Play className="w-[18px] h-[18px] text-emerald-400 shrink-0" />
              <span>Başlat</span>
            </button>
          )
        )}
      </div>
    </Sheet>
  );
};
