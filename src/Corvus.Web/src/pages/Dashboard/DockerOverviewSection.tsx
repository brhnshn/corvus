import React from 'react';
import { Boxes, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { DockerContainer } from '../../types';

export interface DockerOverviewSectionProps {
  containers: DockerContainer[];
  onNavigate?: (page: 'containers') => void;
}

export const DockerOverviewSection: React.FC<DockerOverviewSectionProps> = ({
  containers,
  onNavigate,
}) => {
  const running = containers.filter((c) => c.State.toLowerCase() === 'running').length;
  const stopped = containers.length - running;

  // En fazla 6 konteyner göster, gerisi "Tümünü Gör" butonu ile
  const displayContainers = containers.slice(0, 6);

  return (
    <section className="surface rounded-[22px] p-4 sm:p-5 animate-rv" style={{ animationDelay: '200ms' }}>
      {/* Kart Başlığı */}
      <div className="flex items-center gap-3 mb-3.5">
        <span className="w-8 h-8 rounded-[11px] border border-white/10 bg-white/[0.07] flex items-center justify-center text-[#eceef6] shrink-0">
          <Boxes className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <b className="text-base font-semibold text-[#eceef6] block leading-snug">
            Docker Konteynerleri
          </b>
          <small className="font-mono text-xs text-[#9ba0b5]">
            {running} çalışan{stopped > 0 ? `, ${stopped} durmuş` : ''}
          </small>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('containers')}
            className="ml-auto text-xs font-semibold text-[#eceef6] hover:text-[#d5d5dc] flex items-center gap-1.5 cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/[0.08] transition-colors"
          >
            <span>Detaylar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Konteyner Mini Kartları Izgarası */}
      {containers.length === 0 ? (
        <div className="text-center py-6 text-xs text-[#9ba0b5]">
          Aktif Docker konteyneri bulunamadı
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {displayContainers.map((container) => {
            const cleanName = (container.Names?.[0] || container.Id).replace(/^\//, '');
            const state = container.State.toLowerCase();
            const isRunning = state === 'running';
            const isPaused = state === 'paused';

            const dotColor = isRunning ? 'bg-[#34d399]' : isPaused ? 'bg-[#fbbf24]' : 'bg-[#f87171]';

            // Port bilgisi
            const firstPort = container.Ports?.[0];
            const portText = firstPort
              ? `${firstPort.PublicPort ? `${firstPort.PublicPort}:` : ''}${firstPort.PrivatePort}`
              : null;

            return (
              <div
                key={container.Id}
                onClick={() => onNavigate?.('containers')}
                className="rounded-[16px] p-3 bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] transition-all duration-200 active:scale-[0.97] cursor-pointer flex flex-col justify-between gap-1.5 select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${isRunning ? 'animate-dot-pulse' : ''}`} />
                  <span className="text-[13.5px] font-semibold text-[#eceef6] truncate">
                    {cleanName}
                  </span>
                </div>
                <small className="font-mono text-[11px] text-[#9ba0b5] truncate flex items-center gap-1.5">
                  <span className="truncate">{container.Image}</span>
                  {portText && (
                    <span className="text-indigo-300 font-semibold shrink-0">
                      · {portText}
                    </span>
                  )}
                </small>
              </div>
            );
          })}
        </div>
      )}

      {/* Alt Aksiyon Butonu */}
      {containers.length > 6 && onNavigate && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => onNavigate('containers')}
            className="w-full sm:w-auto"
          >
            Tüm Konteynerleri Gör ({containers.length})
          </Button>
        </div>
      )}
    </section>
  );
};
