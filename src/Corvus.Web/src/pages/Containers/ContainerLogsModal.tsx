import React, { useEffect, useRef, useState } from 'react';
import { 
  X, 
  Terminal, 
  Search, 
  ArrowDown, 
  Trash2, 
  RefreshCw, 
  Radio
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n';

interface ContainerLogsModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({
  containerId,
  containerName,
  onClose
}) => {
  const { t } = useI18n();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [tailCount, setTailCount] = useState<number>(100);
  const [isLive, setIsLive] = useState(true);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // İlk snapshot yüklemesi
  const fetchInitialLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getContainerLogs(containerId, tailCount);
      setLogs(data.lines || []);
    } catch (err) {
      console.error('Loglar alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialLogs();
  }, [containerId, tailCount]);

  // Server-Sent Events (SSE) ile canlı akış
  useEffect(() => {
    if (!isLive) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/containers/${containerId}/logs/stream?tail=30`);

      eventSource.onmessage = (event) => {
        if (event.data) {
          setLogs((prev) => {
            // Tekrarlanan son satırı engelle
            if (prev.length > 0 && prev[prev.length - 1] === event.data) {
              return prev;
            }
            // En fazla son 1000 satırı tut
            const next = [...prev, event.data];
            return next.length > 1000 ? next.slice(next.length - 1000) : next;
          });
        }
      };

      eventSource.onerror = () => {
        // SSE bağlantı hatası durumunda sessizce kapat
        eventSource?.close();
      };
    } catch (e) {
      console.warn('SSE bağlantısı kurulamadı:', e);
    }

    return () => {
      eventSource?.close();
    };
  }, [containerId, isLive]);

  // Otomatik aşağı kaydırma
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filtreleme
  const filteredLogs = search.trim()
    ? logs.filter((line) => line.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const formatLogLine = (line: string) => {
    const isError = /error|fatal|fail|panic|exception/i.test(line);
    const isWarn = /warn|warning/i.test(line);

    let textColor = 'text-[#d4d4d8]';
    if (isError) textColor = 'text-[#ef4444] font-semibold';
    else if (isWarn) textColor = 'text-[#f59e0b]';

    return <span className={textColor}>{line}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="sheet-glass border border-white/10 rounded-[28px] w-full max-w-5xl h-[88vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] overflow-hidden animate-in fade-in duration-200">
        
        {/* Terminal Header */}
        <div className="h-16 px-5 sm:px-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#d5d5dc]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-[#eceef6] truncate max-w-[200px] sm:max-w-md">
                  {containerName}
                </span>
                <span className="text-[11px] font-mono text-[#9ba0b5]">
                  ({containerId.slice(0, 12)})
                </span>
                <button
                  type="button"
                  onClick={() => setIsLive(!isLive)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono cursor-pointer transition-colors ${
                    isLive 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse' 
                      : 'bg-white/[0.06] text-[#9ba0b5] border-white/10'
                  }`}
                  title={isLive ? t('logsModal.pausedBadge') : t('logsModal.liveBadge')}
                >
                  <Radio className="w-2.5 h-2.5" />
                  {isLive ? t('logsModal.liveBadge') : t('logsModal.pausedBadge')}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#9ba0b5] hover:text-[#eceef6] p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs bg-white/[0.01]">
          {/* Arama */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-3.5 h-3.5 text-[#9ba0b5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t('logsModal.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-[#eceef6] placeholder-[#9ba0b5] focus:outline-none focus:border-[#d5d5dc] transition-colors"
            />
          </div>

          {/* Kontroller */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Satır Sayısı Seçici */}
            <select
              value={tailCount}
              onChange={(e) => setTailCount(Number(e.target.value))}
              className="bg-white/[0.04] border border-white/10 hover:border-white/20 rounded-xl px-3 py-1.5 text-xs text-[#eceef6] focus:outline-none focus:border-[#d5d5dc] cursor-pointer transition-colors"
            >
              <option value={50} className="bg-[#12141e] text-[#eceef6]">{t('logsModal.lines50')}</option>
              <option value={100} className="bg-[#12141e] text-[#eceef6]">{t('logsModal.lines100')}</option>
              <option value={250} className="bg-[#12141e] text-[#eceef6]">{t('logsModal.lines250')}</option>
              <option value={500} className="bg-[#12141e] text-[#eceef6]">{t('logsModal.lines500')}</option>
            </select>

            {/* Otomatik Kaydırma */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                autoScroll
                  ? 'bg-white text-black font-semibold border-white'
                  : 'bg-white/[0.04] border-white/10 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08]'
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>{t('logsModal.autoScroll')}</span>
            </button>

            {/* Temizle */}
            <button
              onClick={() => setLogs([])}
              className="flex items-center gap-1 p-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title={t('logsModal.clearTooltip')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Yenile */}
            <button
              onClick={fetchInitialLogs}
              className="flex items-center gap-1 p-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={t('logsModal.refreshTooltip')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 p-4 sm:p-5 overflow-y-auto bg-[#0a0c10]/95 font-mono text-xs leading-relaxed space-y-1 select-text"
        >
          {loading && logs.length === 0 && (
            <div className="flex items-center justify-center h-48 text-[#9ba0b5]">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
              {t('logsModal.loading')}
            </div>
          )}

          {!loading && filteredLogs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-[#9ba0b5]/60">
              <Terminal className="w-8 h-8 mb-2 opacity-40" />
              <span>{t('logsModal.noLogs')}</span>
            </div>
          )}

          {filteredLogs.map((line, idx) => (
            <div key={idx} className="hover:bg-white/[0.04] py-0.5 px-1.5 rounded-md break-all whitespace-pre-wrap transition-colors">
              {formatLogLine(line)}
            </div>
          ))}

          <div ref={logsEndRef} />
        </div>

        {/* Footer */}
        <div className="h-9 px-5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9ba0b5] font-mono bg-white/[0.02]">
          <span>{t('logsModal.showingLines', { count: filteredLogs.length })}</span>
          <span>{t('logsModal.bufferStatus', { current: logs.length, max: 1000 })}</span>
        </div>
      </div>
    </div>
  );
};
