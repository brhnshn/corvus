import React, { useEffect, useState, useRef, useMemo } from 'react';
import { containersApi } from '../../../api/containers';
import { useI18n } from '../../../i18n';
import type { TopologyNode } from '../types';

interface ConsoleDetailInspectPanelProps {
  selectedNode: TopologyNode | null;
  onRefreshData: () => void;
}

export const ConsoleDetailInspectPanel: React.FC<ConsoleDetailInspectPanelProps> = ({
  selectedNode,
  onRefreshData,
}) => {
  const { t } = useI18n();
  const [logs, setLogs] = useState<string[]>([]);
  const [acting, setActing] = useState(false);
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'error'>('all');
  const terminalRef = useRef<HTMLDivElement>(null);

  const containerId = selectedNode?.refContainer?.Id;

  // Gerçek Canlı SSE Log Akışı
  useEffect(() => {
    if (!containerId) {
      setLogs([
        `[INFO] ${selectedNode?.name || 'Bileşen'} seçildi.`,
        `[INFO] ${selectedNode?.subLabel || 'Aktif'}`,
        selectedNode?.refService?.description
          ? `[INFO] ${selectedNode.refService.description}`
          : '[SYSTEM] Container bağlı değil (HTTP kontrol modunda).'
      ]);
      return;
    }

    let isCurrent = true;
    let eventSource: EventSource | null = null;

    // 1. Önce hızlı ilk snapshot
    containersApi.getContainerLogs(containerId, 40)
      .then((res) => {
        if (isCurrent) {
          setLogs(res.lines && res.lines.length > 0 ? res.lines : ['[SYSTEM] Container log akışı hazır.']);
        }
      })
      .catch((err) => {
        if (isCurrent) {
          setLogs([`[HATA] ${err instanceof Error ? err.message : 'Log okunamadı'}`]);
        }
      });

    // 2. Canlı SSE Akışına bağlan (isLiveStream aktifse)
    if (isLiveStream) {
      try {
        eventSource = new EventSource(`/api/containers/${containerId}/logs/stream?tail=10`);
        eventSource.onmessage = (event) => {
          if (!isCurrent || !event.data) return;
          setLogs((prev) => {
            if (prev.length > 0 && prev[prev.length - 1] === event.data) return prev;
            const updated = [...prev, event.data];
            return updated.length > 500 ? updated.slice(updated.length - 500) : updated;
          });
        };
        eventSource.onerror = () => {
          eventSource?.close();
        };
      } catch {
        // SSE hatasında snapshot ile devam et
      }
    }

    return () => {
      isCurrent = false;
      eventSource?.close();
    };
  }, [containerId, isLiveStream, selectedNode?.name, selectedNode?.subLabel, selectedNode?.refService?.description]);

  // Terminali otomatik alta kaydır
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Log filtresi
  const visibleLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => /error|err|fatal|panic|fail|exception/i.test(l));
  }, [logs, logFilter]);

  if (!selectedNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-xs text-[var(--color-text-muted,#64748b)] font-mono bg-[#0e1117] border-l border-[#1e2433]">
        {t('dashboard.console.inspectPlaceholder')}
      </div>
    );
  }

  const handleRestart = async () => {
    if (!containerId) return;
    setActing(true);
    try {
      await containersApi.restartContainer(containerId);
      onRefreshData();
      setLogs((prev) => [...prev, `[SYSTEM] Container restarted (${new Date().toLocaleTimeString()})`]);
    } catch (err: unknown) {
      setLogs((prev) => [...prev, `[HATA] Restart failed: ${err instanceof Error ? err.message : 'Error'}`]);
    } finally {
      setActing(false);
    }
  };

  const handleStart = async () => {
    if (!containerId) return;
    setActing(true);
    try {
      await containersApi.startContainer(containerId);
      onRefreshData();
      setLogs((prev) => [...prev, `[SYSTEM] Container started (${new Date().toLocaleTimeString()})`]);
    } catch (err: unknown) {
      setLogs((prev) => [...prev, `[HATA] Start failed: ${err instanceof Error ? err.message : 'Error'}`]);
    } finally {
      setActing(false);
    }
  };

  const isDead = selectedNode.status === 'err';
  const statusLabel =
    selectedNode.status === 'err'
      ? t('status.stopped')
      : selectedNode.status === 'warn'
      ? t('status.degraded')
      : t('status.running');

  return (
    <div className="flex flex-col h-full bg-[#0e1117] border-l border-[#1e2433] overflow-hidden select-none">
      {/* Üst Başlık & Durum */}
      <div className="p-3.5 bg-[#141822] border-b border-[#1e2433] shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#f1f5f9] font-mono truncate">
            {selectedNode.name}
          </h2>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
              selectedNode.status === 'err'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : selectedNode.status === 'warn'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}
          >
            {statusLabel}
          </span>
        </div>

        {/* Aksiyon Butonları */}
        {containerId && (
          <div className="flex items-center gap-2 mt-3 font-mono text-xs">
            {isDead ? (
              <button
                onClick={handleStart}
                disabled={acting}
                className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded transition-colors disabled:opacity-50"
              >
                {acting ? t('dashboard.console.starting') : t('dashboard.console.startContainer')}
              </button>
            ) : (
              <button
                onClick={handleRestart}
                disabled={acting}
                className="px-3 py-1 bg-[#1e2433] hover:bg-[#2d3748] text-[#f1f5f9] border border-[#2d3748] rounded transition-colors disabled:opacity-50"
              >
                {acting ? t('dashboard.console.restarting') : t('dashboard.console.restartContainer')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Teknik Parametre Tablosu */}
      <div className="p-3 border-b border-[#1e2433] text-[11px] font-mono bg-[#090a0f] grid grid-cols-[80px_1fr] gap-x-2 gap-y-1.5 shrink-0">
        <span className="text-[#64748b]">{t('dashboard.console.type')}:</span>
        <span className="text-[#f1f5f9]">{selectedNode.kind.toUpperCase()}</span>

        <span className="text-[#64748b]">{t('dashboard.console.port')}:</span>
        <span className="text-[#f1f5f9]">{selectedNode.port ? `:${selectedNode.port}` : t('dashboard.console.internalNone')}</span>

        {selectedNode.refContainer && (
          <>
            <span className="text-[#64748b]">{t('dashboard.console.image')}:</span>
            <span className="text-[#94a3b8] truncate">{selectedNode.refContainer.Image}</span>

            <span className="text-[#64748b]">{t('dashboard.console.status')}:</span>
            <span className="text-[#94a3b8]">{selectedNode.refContainer.Status}</span>
          </>
        )}

        {selectedNode.stats && (
          <>
            <span className="text-[#64748b]">{t('dashboard.console.cpuRam')}:</span>
            <span className="text-[#38bdf8]">
              {selectedNode.stats.cpuPercent.toFixed(1)}% · {(selectedNode.stats.memoryUsageBytes / 1024 / 1024).toFixed(0)} MB
            </span>
          </>
        )}

        {selectedNode.refService && (
          <>
            <span className="text-[#64748b]">{t('dashboard.console.status')}:</span>
            <span className="text-[#10b981]">{selectedNode.refService.status.toUpperCase()}</span>
          </>
        )}
      </div>

      {/* Canlı Log Terminali */}
      <div className="flex-1 flex flex-col bg-[#090a0f] min-h-0 overflow-hidden font-mono">
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#141822] border-b border-[#1e2433] text-[10px] text-[#64748b]">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isLiveStream ? 'bg-[#10b981] animate-pulse' : 'bg-[#64748b]'}`} />
            <span>{t('dashboard.console.liveOutput')}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLogFilter(logFilter === 'all' ? 'error' : 'all')}
              className={`px-1.5 py-0.5 rounded border text-[9px] ${
                logFilter === 'error'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-[#090a0f] text-[#64748b] border-[#1e2433]'
              }`}
            >
              {logFilter === 'error' ? t('dashboard.console.errOnly') : t('dashboard.console.allLevels')}
            </button>
            <button
              onClick={() => setIsLiveStream(!isLiveStream)}
              className="px-1.5 py-0.5 rounded border border-[#1e2433] bg-[#090a0f] text-[#94a3b8] hover:text-[#f1f5f9] text-[9px]"
            >
              {isLiveStream ? t('dashboard.console.pauseStream') : t('dashboard.console.resumeStream')}
            </button>
          </div>
        </div>

        <div
          ref={terminalRef}
          className="flex-1 p-2.5 overflow-y-auto text-[11px] leading-relaxed text-[#cbd5e1] space-y-1 select-text scrollbar-thin"
        >
          {visibleLogs.length === 0 ? (
            <div className="text-[#64748b] py-2 text-center text-xs">{t('dashboard.console.noResults')}</div>
          ) : (
            visibleLogs.map((line, idx) => {
              const isErr = /error|fatal|fail|panic|exception/i.test(line);
              return (
                <div key={idx} className={`break-all whitespace-pre-wrap font-mono ${isErr ? 'text-rose-400' : ''}`}>
                  <span className="text-[#475569] mr-2">[{idx + 1}]</span>
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
