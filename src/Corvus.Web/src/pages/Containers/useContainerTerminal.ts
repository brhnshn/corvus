import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useI18n } from '../../i18n';
import {
  type TerminalConnectionState,
  createTerminalOptions,
  buildTerminalWsUrl
} from './terminal/terminal.utils';

/**
 * Konteyner terminal oturumunun yaşam döngüsü:
 * xterm örneği, WebSocket bağlantısı, yeniden boyutlandırma ve ESC ile kapatma.
 */
export function useContainerTerminal(containerId: string, onClose: () => void) {
  const { t } = useI18n();
  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connectionState, setConnectionState] = useState<TerminalConnectionState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shell, setShell] = useState<string>('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    const term = new XTerm(createTerminalOptions());

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // DOM'a bağlama
    terminalElementRef.current.innerHTML = '';
    term.open(terminalElementRef.current);
    fitAddon.fit();
    term.focus();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const ws = new WebSocket(buildTerminalWsUrl(containerId, shell));
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
        term.write(`\r\n\x1b[33m[Corvus] ${t('containers.connectionTerminated', { code: event.code })}\x1b[0m\r\n`);
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

  const focusTerminal = () => xtermRef.current?.focus();

  return {
    terminalElementRef,
    connectionState,
    errorMessage,
    shell,
    setShell,
    isFullscreen,
    setIsFullscreen,
    handleClear,
    handleReconnect,
    focusTerminal
  };
}
