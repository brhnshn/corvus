import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { 
  X, 
  SquareTerminal, 
  Trash2, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { useI18n } from '../../i18n';

interface ContainerTerminalModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

interface ShellOption {
  value: string;
  labelKey?: string;
  defaultLabel: string;
}

const SHELL_OPTIONS: ShellOption[] = [
  { value: 'auto', labelKey: 'containers.terminalShellAuto', defaultLabel: 'Otomatik / Auto-Detect' },
  { value: '/bin/sh', defaultLabel: '/bin/sh (POSIX / Alpine)' },
  { value: '/bin/bash', defaultLabel: '/bin/bash (Debian / Ubuntu)' },
  { value: '/bin/ash', defaultLabel: '/bin/ash (BusyBox)' },
  { value: '/bin/zsh', defaultLabel: '/bin/zsh (Zsh)' }
];

export const ContainerTerminalModal: React.FC<ContainerTerminalModalProps> = ({
  containerId,
  containerName,
  onClose
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
  const [showHelp, setShowHelp] = useState(false);

  // Terminal ebatlarını ana sürece (Docker daemon) bildirme
  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        cols,
        rows
      }));
    }
  }, []);

  // WebSocket ve xterm oturumunu başlatma
  const connectTerminal = useCallback(() => {
    // Önceki bağlantıyı ve terminal örneğini güvenle temizle
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

    // xterm başlatma
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

    // DOM'a bağlama
    terminalElementRef.current.innerHTML = '';
    term.open(terminalElementRef.current);
    fitAddon.fit();
    term.focus();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // WebSocket URL oluşturma
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/containers/${containerId}/terminal?shell=${encodeURIComponent(shell)}`;

    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState('connected');
      // İlk ebatları Docker exec sürecine gönder
      sendResize(term.cols, term.rows);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
      } else if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buf) => {
          term.write(new Uint8Array(buf));
        });
      }
    };

    ws.onerror = (e) => {
      console.error('Terminal WebSocket hatası:', e);
      setConnectionState('error');
      setErrorMessage(t('containers.terminalError'));
    };

    ws.onclose = (event) => {
      setConnectionState('disconnected');
      if (event.code !== 1000 && event.code !== 1001) {
        term.write(`\r\n\x1b[33m[Corvus] Bağlantı sonlandırıldı (Kod: ${event.code}).\x1b[0m\r\n`);
      }
    };

    // Terminal kullanıcı girdilerini WebSocket üzerinden Docker daemon'a aktar
    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // fitAddon resize dinleyicisi
    const resizeDisposable = term.onResize((size) => {
      sendResize(size.cols, size.rows);
    });

    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
    };
  }, [containerId, shell, sendResize, t]);

  // İlk yükleme ve shell değişiminde bağlan
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
      if (fitAddonRef.current) {
        fitAddonRef.current.dispose();
        fitAddonRef.current = null;
      }
    };
  }, [connectTerminal]);

  // Pencere boyutu veya tam ekran değiştiğinde fitAddon ile yeniden boyutlandır
  useEffect(() => {
    const handleWindowResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          sendResize(xtermRef.current.cols, xtermRef.current.rows);
        } catch {
          // ignore measurement errors during transition
        }
      }
    };

    // Modal açıldıktan hemen sonra hafif gecikmeli bir fit çağrısı (CSS geçişleri için)
    const timer = setTimeout(handleWindowResize, 100);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isFullscreen, sendResize]);

  // ESC tuşuyla kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.focus();
    }
  };

  const handleReconnect = () => {
    connectTerminal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div 
        className={`flex flex-col sheet-glass border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'w-full h-full rounded-none border-none' 
            : 'w-full max-w-5xl h-[86vh] max-h-[820px] rounded-[28px]'
        }`}
      >
        {/* Üst Başlık ve Kontrol Çubuğu */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 h-16 bg-white/[0.02] border-b border-white/10 select-none shrink-0">
          {/* Sol: İkon, İsim ve Bağlantı Durumu */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#d5d5dc] shrink-0">
              <SquareTerminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#eceef6] truncate">{containerName}</h2>
                <span className="text-xs font-mono text-[#9ba0b5]">({containerId.slice(0, 12)})</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {connectionState === 'connecting' && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    {t('containers.terminalConnecting')}
                  </span>
                )}
                {connectionState === 'connected' && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('containers.terminalConnected')}
                  </span>
                )}
                {connectionState === 'disconnected' && (
                  <span className="flex items-center gap-1.5 text-xs text-[#9ba0b5]">
                    <span className="w-2 h-2 rounded-full bg-gray-500" />
                    {t('containers.terminalDisconnected')}
                  </span>
                )}
                {connectionState === 'error' && (
                  <span className="flex items-center gap-1.5 text-xs text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {errorMessage || t('containers.terminalError')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sağ: Shell Seçimi ve Aksiyon Butonları */}
          <div className="flex items-center gap-2">
            {/* Shell Seçici */}
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-1 text-xs">
              <span className="text-[#9ba0b5] hidden sm:inline">{t('containers.terminalShell')}:</span>
              <select
                value={shell}
                onChange={(e) => setShell(e.target.value)}
                className="bg-transparent text-[#eceef6] font-mono text-xs focus:outline-none cursor-pointer"
                title={t('containers.terminalShell')}
              >
                {SHELL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#12141e] text-[#eceef6]">
                    {opt.labelKey ? t(opt.labelKey as any) : opt.defaultLabel}
                  </option>
                ))}
              </select>
            </div>

            {/* Yeniden Bağlan */}
            <button
              onClick={handleReconnect}
              className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={t('containers.terminalReconnect')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Ekranı Temizle */}
            <button
              onClick={handleClear}
              className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={t('containers.terminalClear')}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* İpucu / Yardım */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                showHelp 
                  ? 'border-[#d5d5dc]/40 bg-white/10 text-white' 
                  : 'border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08]'
              }`}
              title="Bilgi"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Tam Ekran Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer hidden sm:block"
              title={isFullscreen ? t('containers.terminalExitFullscreen') : t('containers.terminalFullscreen')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Kapat Butonu */}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors cursor-pointer ml-1"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Yardım Bilgi Şeridi */}
        {showHelp && (
          <div className="px-5 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-xs text-[#9ba0b5]">
            <span>{t('containers.terminalHelpTip')}</span>
            <button 
              onClick={() => setShowHelp(false)} 
              className="text-[#eceef6] hover:underline text-[11px] ml-4 cursor-pointer font-medium"
            >
              Gizle
            </button>
          </div>
        )}

        {/* xterm.js Terminal Tuvali */}
        <div 
          ref={terminalElementRef} 
          className="flex-1 w-full h-full bg-[#0a0c10] p-3 overflow-hidden font-mono focus:outline-none"
          onClick={() => xtermRef.current?.focus()}
        />

        {/* Alt Bilgi Çubuğu */}
        <div className="flex items-center justify-between px-5 py-2 bg-white/[0.02] border-t border-white/10 text-[11px] text-[#9ba0b5] select-none shrink-0">
          <div className="flex items-center gap-3">
            <span>Konteyner: <strong className="text-[#eceef6] font-mono">{containerName}</strong></span>
            <span>Kabuk: <strong className="text-[#d5d5dc] font-mono">{shell}</strong></span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>VT100 / xterm-256color</span>
            <span className="text-white/20">|</span>
            <span>Zero-Allocation WebSocket</span>
          </div>
        </div>
      </div>
    </div>
  );
};
