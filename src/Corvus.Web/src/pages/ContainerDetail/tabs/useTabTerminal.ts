import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useI18n } from '../../../i18n';
import { useLoadEffect } from '../../../hooks/useLoadEffect';
import {
  createTerminalOptions,
  buildTerminalWsUrl,
  type TerminalConnectionState,
} from '../../Containers/terminal/terminal.utils';

export function useTabTerminal(containerId: string) {
  const { t } = useI18n();
  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connectionState, setConnectionState] = useState<TerminalConnectionState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shell, setShell] = useState<string>('auto');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        cols,
        rows,
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

    const term = new XTerm(createTerminalOptions());
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    terminalElementRef.current.innerHTML = '';
    term.open(terminalElementRef.current);
    fitAddon.fit();
    term.focus();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const wsUrl = buildTerminalWsUrl(containerId, shell);

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch {
      setConnectionState('error');
      setErrorMessage(t('containers.terminalWsInitError'));
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
      setErrorMessage(t('containers.terminalError'));
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
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
    };
  }, [containerId, shell, sendResize, t]);

  useLoadEffect(connectTerminal);

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

  return {
    terminalElementRef,
    xtermRef,
    connectionState,
    errorMessage,
    shell,
    setShell,
    isFullscreen,
    setIsFullscreen,
    connectTerminal,
  };
}
