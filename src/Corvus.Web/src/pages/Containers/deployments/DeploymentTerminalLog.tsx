import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useI18n } from '../../../i18n';
import { parseAnsiToSegments, stripAnsi } from '../../../utils/ansi';
import { Terminal, Copy, Check, Search, ArrowDown, Trash2 } from 'lucide-react';

export interface DeploymentTerminalLogProps {
  logs: string[];
  isStreaming?: boolean;
  onClear?: () => void;
  heightClass?: string; // default: 'h-[320px]'
}

export const DeploymentTerminalLog: React.FC<DeploymentTerminalLogProps> = ({
  logs,
  isStreaming = false,
  onClear,
  heightClass = 'h-[320px]'
}) => {
  const { t } = useI18n();
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-scroll to bottom on new log line if enabled
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Handle manual scroll to toggle autoScroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCopy = async () => {
    const rawText = logs.map(stripAnsi).join('\n');
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  // Filter logs by search query if any
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter((line) => stripAnsi(line).toLowerCase().includes(query));
  }, [logs, searchQuery]);

  return (
    <div className="flex flex-col bg-[#0b0d13] border border-[var(--border-hairline)] rounded-[var(--radius-md)] overflow-hidden font-mono select-text">
      {/* Terminal Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/[0.06] text-xs">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-zinc-300">Corvus Deployment Console</span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-3 h-3 text-[var(--text-muted)] absolute left-2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('deployments.searchLogsPlaceholder')}
              className="w-32 focus:w-44 transition-all duration-200 bg-white/[0.05] border border-white/[0.08] focus:border-indigo-500/50 rounded text-[11px] pl-6 pr-2 py-0.5 text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
            />
          </div>

          {/* Auto Scroll Toggle */}
          <button
            type="button"
            onClick={scrollToBottom}
            title={t('deployments.autoScroll')}
            className={`p-1.5 rounded transition-colors ${
              autoScroll
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            title={t('deployments.copyLogs')}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Clear Button */}
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              title={t('deployments.clearLogs')}
              className="p-1.5 rounded text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Area */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`p-3.5 overflow-y-auto ${heightClass} text-[12px] leading-relaxed select-text space-y-0.5 custom-scrollbar`}
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
            {searchQuery ? t('containers.noLogsMatchingSearch') : t('containers.noLogsYet')}
          </div>
        ) : (
          filteredLogs.map((logLine, idx) => {
            const segments = parseAnsiToSegments(logLine);
            return (
              <div key={idx} className="break-all whitespace-pre-wrap">
                <span className="text-zinc-600 select-none mr-2 text-[10px] opacity-60">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                {segments.map((seg, sIdx) => (
                  <span key={sIdx} className={seg.className}>
                    {seg.text}
                  </span>
                ))}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
