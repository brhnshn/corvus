import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusDot } from '../../components/ui/StatusDot';
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

  // En fazla 6 konteyner göster
  const displayContainers = containers.slice(0, 6);

  return (
    <Card>
      <CardHeader
        action={
          onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('containers')}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--cloud-100)] transition-colors cursor-pointer"
            >
              Tümünü Gör ({containers.length}) →
            </button>
          )
        }
      >
        <div>
          <CardTitle>Docker Konteynerleri</CardTitle>
          <span className="text-xs font-mono tabular-nums text-[var(--text-muted)] block mt-0.5">
            {running} çalışan{stopped > 0 ? `, ${stopped} durmuş` : ''}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {containers.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--text-muted)]">
            Aktif Docker konteyneri bulunamadı
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {displayContainers.map((container) => {
              const cleanName = (container.Names?.[0] || container.Id).replace(/^\//, '');
              const state = container.State.toLowerCase();
              const isRunning = state === 'running';
              const isPaused = state === 'paused';
              const dotStatus = isRunning ? 'up' : isPaused ? 'warn' : 'down';

              // Port bilgisi
              const firstPort = container.Ports?.[0];
              const portText = firstPort
                ? `${firstPort.PublicPort ? `${firstPort.PublicPort}:` : ''}${firstPort.PrivatePort}`
                : null;

              return (
                <div
                  key={container.Id}
                  onClick={() => onNavigate?.('containers')}
                  className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] hover:border-[var(--cloud-400)] transition-all cursor-pointer flex flex-col justify-between gap-1.5 select-none"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusDot status={dotStatus} />
                    <span className="text-[13px] font-mono font-medium text-[var(--cloud-100)] truncate">
                      {cleanName}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[var(--text-secondary)] truncate flex items-center gap-1.5">
                    <span className="truncate">{container.Image}</span>
                    {portText && (
                      <span className="text-[var(--cloud-300)] font-semibold shrink-0">
                        · {portText}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {containers.length > 6 && onNavigate && (
          <div className="mt-3.5 flex justify-center">
            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigate('containers')}
            >
              Tüm Konteynerleri Gör ({containers.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

