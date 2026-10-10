import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { 
  SquareTerminal, 
  Trash2, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useI18n } from '../../../i18n';

interface TerminalTabProps {
  containerId: string;
  containerName: string;
}

interface ShellOption {
  value: string;
  defaultLabel: string;
}

const SHELL_OPTIONS: ShellOption[] = [
  { value: 'auto', defaultLabel: 'Otomatik / Auto-Detect' },
  { value: '/bin/sh', defaultLabel: '/bin/sh (POSIX / Alpine)' },
  { value: '/bin/bash', defaultLabel: '/bin/bash (Debian / Ubuntu)' },
  { value: '/bin/ash', defaultLabel: '/bin/ash (BusyBox)' },
  { value: '/bin/zsh', defaultLabel: '/bin/zsh (Zsh)' }
];

export const TerminalTab: React.FC<TerminalTabProps> = ({
  containerId,
  containerName
}) => {
  const { t } = useI18n();
  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shell, setShell] = useState<string>('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        cols,
        rows
      }));
    }
  }, []);

  const connectTerminal = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    if (fitAddonRef.current) {
      fitAddonRef.current.dispose();
      fitAddonRef.current = null;
    }

    if (!terminalElementRef.current) return;

    setConnectionState('connecting');
    setErrorMessage(null);

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      theme: {
        background: '#0a0c10',
        foreground: '#e5e7eb',
        cursor: '#6366f1',
        selectionBackground: 'rgba(99, 102, 241, 0.3)',
        black: '#1f2937',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f3f4f6',
        brightBlack: '#4b5563',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff'
      },
      convertEol: true,
      allowTransparency: false
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    terminalElementRef.current.innerHTML = '';
    term.open(terminalElementRef.current);
    fitAddon.fit();
    term.focus();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/containers/${containerId}/terminal?shell=${encodeURIComponent(shell)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch {
      setConnectionState('error');
      setErrorMessage('WebSocket bağlantısı başlatılamadı.');
      return;
    }

    ws.onopen = () => {
      setConnectionState('connected');
      sendResize(term.cols, term.rows);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data);
      } else if (event.data instanceof Blob) {
        event.data.text().then((text) => term.write(text));
      }
    };

    ws.onerror = () => {
      setConnectionState('error');
      setErrorMessage('Bağlantı hatası oluştu.');
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
    };

    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    return () => {
      dataDisposable.dispose();
    };
  }, [containerId, shell, sendResize]);

  useEffect(() => {
    const cleanup = connectTerminal();
    return () => {
      if (cleanup) cleanup();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, [connectTerminal]);

  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          sendResize(xtermRef.current.cols, xtermRef.current.rows);
        } catch {
          // ignore fit error
        }
      }
    };

    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 150);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [sendResize, isFullscreen]);

  return (
    <div
      className={`
        surface rounded-[24px] border border-white/10 p-5 sm:p-6 space-y-4 animate-rv shadow-xl flex flex-col
        ${isFullscreen ? 'fixed inset-4 z-50 rounded-2xl bg-[#0d0e15]' : 'h-[650px]'}
      `}
    >
      {/* Üst Araç Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <SquareTerminal className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-[#eceef6]">
            {t('containers.terminalTitle') || 'Web Terminali'}
          </h2>
          <span className="text-xs font-mono text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            {containerName}
          </span>

          {/* Bağlantı Durumu Rozeti */}
          <span
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              connectionState === 'connected'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : connectionState === 'connecting'
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }`}
          >
            {connectionState === 'connected' ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Bağlandı</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Bağlanıyor</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3" />
                <span>Bağlantı Kesildi</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Shell Seçici */}
          <select
            value={shell}
            onChange={(e) => setShell(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-[#eceef6] focus:outline-hidden cursor-pointer font-mono"
          >
            {SHELL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.defaultLabel}
              </option>
            ))}
          </select>

          {/* Yeniden Bağlan */}
          <button
            type="button"
            onClick={connectTerminal}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
            title="Yeniden Bağlan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Ekranı Temizle */}
          <button
            type="button"
            onClick={() => xtermRef.current?.clear()}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
            title="Terminali Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Tam Ekran Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
            title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
          {errorMessage}
        </div>
      )}

      {/* Terminal Gömülü Alanı */}
      <div
        ref={terminalElementRef}
        className="flex-1 w-full bg-[#0a0c10] border border-white/10 rounded-2xl p-3 overflow-hidden shadow-inner"
      />
    </div>
  );
};
