import type { ITerminalOptions } from '@xterm/xterm';

export type TerminalConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ShellOption {
  value: string;
  labelKey?: string;
  defaultLabel: string;
}

export const SHELL_OPTIONS: ShellOption[] = [
  { value: 'auto', labelKey: 'containers.terminalShellAuto', defaultLabel: 'Otomatik / Auto-Detect' },
  { value: '/bin/sh', defaultLabel: '/bin/sh (POSIX / Alpine)' },
  { value: '/bin/bash', defaultLabel: '/bin/bash (Debian / Ubuntu)' },
  { value: '/bin/ash', defaultLabel: '/bin/ash (BusyBox)' },
  { value: '/bin/zsh', defaultLabel: '/bin/zsh (Zsh)' }
];

// xterm başlatma seçenekleri (her bağlantıda taze bir nesne)
export const createTerminalOptions = (): ITerminalOptions => ({
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

// WebSocket URL oluşturma
export const buildTerminalWsUrl = (containerId: string, shell: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/api/containers/${containerId}/terminal?shell=${encodeURIComponent(shell)}`;
};
