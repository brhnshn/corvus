import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Copy, Check, ArrowDown, Search, Trash2, FileText } from 'lucide-react';
import { containersApi } from '../../../api/containers';
import { useI18n } from '../../../i18n';

interface LogsTabProps {
  containerId: string;
  containerName: string;
}

export const LogsTab: React.FC<LogsTabProps> = ({ containerId, containerName }) => {
  const { t } = useI18n();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tail, setTail] = useState<number>(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const fetchLogs = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await containersApi.getContainerLogs(containerId, tail);
      if (data && Array.isArray(data.lines)) {
        setLogs(data.lines);
      }
    } catch (err) {
      console.error('Loglar alınamadı:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [containerId, tail]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (!document.hidden) fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearDisplay = () => {
    setLogs([]);
  };

  const filteredLogs = search.trim()
    ? logs.filter((line) => line.toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <div className="surface rounded-[24px] p-5 sm:p-6 border border-white/10 space-y-4 animate-rv shadow-xl">
      {/* Üst Araç Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-[#eceef6]">
            {t('containers.logsTitle') || 'Konteyner Logları'}
          </h2>
          <span className="text-xs font-mono text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            {containerName}
          </span>
          <span className="text-xs font-mono text-[#9ba0b5] px-2 py-0.5 rounded-full bg-white/[0.04]">
            {filteredLogs.length} satır
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Arama Inputu */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#9ba0b5] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search') || 'Loglarda ara...'}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-hidden focus:border-indigo-400 w-36 sm:w-44"
            />
          </div>

          {/* Satır Sayısı Seçici */}
          <select
            value={tail}
            onChange={(e) => setTail(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-[#eceef6] focus:outline-hidden cursor-pointer font-mono"
          >
            <option value={50}>50 satır</option>
            <option value={100}>100 satır</option>
            <option value={250}>250 satır</option>
            <option value={500}>500 satır</option>
            <option value={1000}>1000 satır</option>
          </select>

          {/* Canlı Akış Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              autoRefresh
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-white/[0.04] text-[#9ba0b5] border-white/10'
            }`}
          >
            {autoRefresh ? '● Canlı Akış' : '○ Duraklatıldı'}
          </button>

          {/* Otomatik Kaydırma */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            title="Otomatik en alta kaydır"
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              autoScroll
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-white/[0.04] text-[#9ba0b5] border-white/10'
            }`}
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          {/* Yenile Butonu */}
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Kopyala Butonu */}
          <button
            type="button"
            onClick={handleCopyLogs}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
            title="Tüm logları kopyala"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Ekranı Temizle */}
          <button
            type="button"
            onClick={handleClearDisplay}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-red-400 border border-white/10 transition-colors cursor-pointer"
            title="Ekranı temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log Konsolu Penceresi */}
      <div
        ref={logContainerRef}
        className="bg-[#0a0c10] border border-white/10 rounded-2xl p-4 font-mono text-xs text-[#e5e7eb] h-[550px] overflow-y-auto no-scrollbar space-y-1 select-text shadow-inner"
      >
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#9ba0b5] gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>Loglar yükleniyor...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/40">
            {search ? 'Aramayla eşleşen log kaydı bulunamadı.' : 'Henüz log çıktısı yok.'}
          </div>
        ) : (
          filteredLogs.map((line, index) => (
            <div
              key={index}
              className="leading-relaxed hover:bg-white/[0.04] px-1.5 py-0.5 rounded break-all whitespace-pre-wrap font-mono text-[12px]"
            >
              <span className="text-white/20 select-none mr-3 inline-block w-8 text-right">
                {index + 1}
              </span>
              <span>{line}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};
