import React from 'react';
import '@xterm/xterm/css/xterm.css';
import { useTabTerminal } from './useTabTerminal';
import { TerminalToolbar } from './TerminalToolbar';

export interface TerminalTabProps {
  containerId: string;
  containerName: string;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  containerId,
  containerName,
}) => {
  const {
    terminalElementRef,
    xtermRef,
    connectionState,
    errorMessage,
    shell,
    setShell,
    isFullscreen,
    setIsFullscreen,
    connectTerminal,
  } = useTabTerminal(containerId);

  return (
    <div
      className={`
        surface rounded-[24px] border border-white/10 p-5 sm:p-6 space-y-4 animate-rv shadow-xl flex flex-col
        ${isFullscreen ? 'fixed inset-4 z-50 rounded-2xl bg-[#0d0e15]' : 'h-[650px]'}
      `}
    >
      <TerminalToolbar
        containerName={containerName}
        connectionState={connectionState}
        errorMessage={errorMessage}
        shell={shell}
        onShellChange={setShell}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onReconnect={connectTerminal}
        onClear={() => xtermRef.current?.clear()}
      />

      {/* Terminal Gömülü Alanı */}
      <div
        ref={terminalElementRef}
        className="flex-1 w-full bg-[#0a0c10] border border-white/10 rounded-2xl p-3 overflow-hidden shadow-inner"
      />
    </div>
  );
};
