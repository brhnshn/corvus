import React, { useState } from 'react';
import '@xterm/xterm/css/xterm.css';
import { useI18n } from '../../i18n';
import { useContainerTerminal } from './useContainerTerminal';
import { TerminalHeader } from './terminal/TerminalHeader';

interface ContainerTerminalModalProps {
  containerId: string;
  containerName: string;
  onClose: () => void;
}

export const ContainerTerminalModal: React.FC<ContainerTerminalModalProps> = ({
  containerId,
  containerName,
  onClose
}) => {
  const { t } = useI18n();
  const [showHelp, setShowHelp] = useState(false);

  const {
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
  } = useContainerTerminal(containerId, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
      <div
        className={`flex flex-col sheet-glass border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-5xl h-[86vh] max-h-[820px] rounded-[28px]'
        }`}
      >
        <TerminalHeader
          containerId={containerId}
          containerName={containerName}
          connectionState={connectionState}
          errorMessage={errorMessage}
          shell={shell}
          onShellChange={setShell}
          showHelp={showHelp}
          onToggleHelp={() => setShowHelp(!showHelp)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onReconnect={handleReconnect}
          onClear={handleClear}
          onClose={onClose}
        />

        {/* Yardım Bilgi Şeridi */}
        {showHelp && (
          <div className="px-5 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-xs text-[#9ba0b5]">
            <span>{t('containers.terminalHelpTip')}</span>
            <button
              onClick={() => setShowHelp(false)}
              className="text-[#eceef6] hover:underline text-[11px] ml-4 cursor-pointer font-medium"
            >
              {t('containers.terminalHideHelp')}
            </button>
          </div>
        )}

        {/* xterm.js Terminal Tuvali */}
        <div
          ref={terminalElementRef}
          className="flex-1 w-full h-full bg-[#0a0c10] p-3 overflow-hidden font-mono focus:outline-none"
          onClick={focusTerminal}
        />

        {/* Alt Bilgi Çubuğu */}
        <div className="flex items-center justify-between px-5 py-2 bg-white/[0.02] border-t border-white/10 text-[11px] text-[#9ba0b5] select-none shrink-0">
          <div className="flex items-center gap-3">
            <span>{t('containers.terminalFooterContainer')}: <strong className="text-[#eceef6] font-mono">{containerName}</strong></span>
            <span>{t('containers.terminalFooterShell')}: <strong className="text-[#d5d5dc] font-mono">{shell}</strong></span>
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
