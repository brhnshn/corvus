import React from 'react';
import {
  SquareTerminal,
  Trash2,
  RefreshCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useI18n } from '../../../i18n';
import {
  SHELL_OPTIONS,
  type TerminalConnectionState,
} from '../../Containers/terminal/terminal.utils';

export interface TerminalToolbarProps {
  containerName: string;
  connectionState: TerminalConnectionState;
  errorMessage: string | null;
  shell: string;
  onShellChange: (shell: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onReconnect: () => void;
  onClear: () => void;
}

export const TerminalToolbar: React.FC<TerminalToolbarProps> = ({
  containerName,
  connectionState,
  errorMessage,
  shell,
  onShellChange,
  isFullscreen,
  onToggleFullscreen,
  onReconnect,
  onClear,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <SquareTerminal className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-[#eceef6]">
            {t('containers.terminalTitle')}
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
                <span>{t('containers.terminalConnected')}</span>
              </>
            ) : connectionState === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>{t('containers.terminalConnecting')}</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3" />
                <span>{t('containers.terminalDisconnected')}</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Shell Seçici */}
          <select
            value={shell}
            onChange={(e) => onShellChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-[#eceef6] focus:outline-hidden cursor-pointer font-mono"
          >
            {SHELL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.labelKey ? t(opt.labelKey as any) : opt.defaultLabel}
              </option>
            ))}
          </select>

          {/* Yeniden Bağlan */}
          <button
            type="button"
            onClick={onReconnect}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
            title={t('containers.terminalReconnect')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Ekranı Temizle */}
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
            title={t('containers.terminalClear')}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Tam Ekran Toggle */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer"
            title={isFullscreen ? t('containers.terminalExitFullscreen') : t('containers.terminalFullscreen')}
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
    </>
  );
};
