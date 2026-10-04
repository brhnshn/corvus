import React from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { 
  FileText, 
  Terminal, 
  Info, 
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
  const state = container.State.toLowerCase();
  const isRunning = state === 'running';
  const isPaused = state === 'paused';

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={cleanName}
      subtitle={container.Image}
    >
      <div className="space-y-1 pt-1">
        {/* Günlükler */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenLogs(container.Id, cleanName);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.08] transition-colors text-left text-sm font-medium text-[#eceef6] cursor-pointer"
        >
          <FileText className="w-4 h-4 text-[#9ba0b5]" />
          <span>Canlı Günlükler (Logs)</span>
        </button>

        {/* Terminal (Sadece çalışıyorsa ve adminse) */}
        {isRunning && isAdmin && onOpenTerminal && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTerminal(container.Id, cleanName);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.08] transition-colors text-left text-sm font-medium text-[#eceef6] cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-[#818cf8]" />
            <span>Konteyner Terminali (Exec Console)</span>
          </button>
        )}

        {/* Detaylar / Inspect */}
        {onInspect && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onInspect(container);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.08] transition-colors text-left text-sm font-medium text-[#eceef6] cursor-pointer"
          >
            <Info className="w-4 h-4 text-[#9ba0b5]" />
            <span>Konteyner Detayları & Yapılandırma</span>
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
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.08] transition-colors text-left text-sm font-medium text-[#eceef6] cursor-pointer"
          >
            <Tag className="w-4 h-4 text-[#9ba0b5]" />
            <span>Etiketleri Yönet</span>
          </button>
        )}

        <div className="border-t border-white/10 my-2" />

        {/* Yaşam Döngüsü Aksiyonları */}
        {isAdmin && (
          <>
            {/* Duraklat / Devam Et */}
            {isRunning && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAction('pause', container.Id, cleanName);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.08] transition-colors text-left text-sm font-medium text-[#fbbf24] cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Konteyneri Duraklat</span>
              </button>
            )}

            {isPaused && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAction('unpause', container.Id, cleanName);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.08] transition-colors text-left text-sm font-medium text-[#34d399] cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Konteyneri Devam Ettir</span>
              </button>
            )}

            {/* Yeniden Başlat */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onAction('restart', container.Id, cleanName);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.08] transition-colors text-left text-sm font-medium text-[#eceef6] cursor-pointer"
            >
              <RotateCw className="w-4 h-4 text-[#9ba0b5]" />
              <span>Yeniden Başlat</span>
            </button>

            {/* Durdur / Başlat */}
            {isRunning ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAction('stop', container.Id, cleanName);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 transition-colors text-left text-sm font-medium text-[#f87171] cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>Konteyneri Durdur</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAction('start', container.Id, cleanName);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-500/10 transition-colors text-left text-sm font-medium text-[#34d399] cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Konteyneri Başlat</span>
              </button>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
};
