import React from 'react';
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
import { useI18n } from '../../../i18n';
import { SHELL_OPTIONS, type TerminalConnectionState } from './terminal.utils';

interface TerminalHeaderProps {
  containerId: string;
  containerName: string;
  connectionState: TerminalConnectionState;
  errorMessage: string | null;
  shell: string;
  onShellChange: (shell: string) => void;
  showHelp: boolean;
  onToggleHelp: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onReconnect: () => void;
  onClear: () => void;
  onClose: () => void;
}

const iconButtonClass = 'p-2 rounded-xl border border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer';

/** Üst Başlık ve Kontrol Çubuğu */
export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  containerId,
  containerName,
  connectionState,
  errorMessage,
  shell,
  onShellChange,
  showHelp,
  onToggleHelp,
  isFullscreen,
  onToggleFullscreen,
  onReconnect,
  onClear,
  onClose
}) => {
  const { t } = useI18n();

  return (
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
            onChange={(e) => onShellChange(e.target.value)}
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
          onClick={onReconnect}
          className={iconButtonClass}
          title={t('containers.terminalReconnect')}
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Ekranı Temizle */}
        <button
          onClick={onClear}
          className={iconButtonClass}
          title={t('containers.terminalClear')}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* İpucu / Yardım */}
        <button
          onClick={onToggleHelp}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            showHelp
              ? 'border-[#d5d5dc]/40 bg-white/10 text-white'
              : 'border-white/10 bg-white/[0.04] text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08]'
          }`}
          title={t('containers.terminalInfoTooltip')}
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Tam Ekran Toggle */}
        <button
          onClick={onToggleFullscreen}
          className={`${iconButtonClass} hidden sm:block`}
          title={isFullscreen ? t('containers.terminalExitFullscreen') : t('containers.terminalFullscreen')}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Kapat Butonu */}
        <button
          onClick={onClose}
          className="p-2 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors cursor-pointer ml-1"
          title={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
