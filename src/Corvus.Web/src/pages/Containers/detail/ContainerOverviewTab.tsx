import React from 'react';
import { useI18n } from '../../../i18n';
import { Play, Square, RotateCw, Pause, Terminal, FileText, Copy, Check } from 'lucide-react';
import type { DockerContainerInspectInfo, DockerContainer } from '../../../types';
import { getInspectConfig, getInspectState, getInspectHostConfig } from './inspectHelpers';

interface ContainerOverviewTabProps {
  inspect: DockerContainerInspectInfo;
  containerSummary?: DockerContainer;
  isAdmin: boolean;
  actionLoading: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onPause: () => void;
  onUnpause: () => void;
  onOpenTerminal: () => void;
  onOpenLogs: () => void;
}

export const ContainerOverviewTab: React.FC<ContainerOverviewTabProps> = ({
  inspect,
  isAdmin,
  actionLoading,
  onStart,
  onStop,
  onRestart,
  onPause,
  onUnpause,
  onOpenTerminal,
  onOpenLogs
}) => {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = React.useState(false);

  const config = getInspectConfig(inspect);
  const state = getInspectState(inspect);
  const hostConfig = getInspectHostConfig(inspect);

  const handleCopyId = () => {
    navigator.clipboard.writeText(inspect.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isRunning = state.running ?? false;
  const isPaused = state.paused ?? false;
  const statusStr = state.status ?? 'unknown';

  const formatDate = (isoString?: string) => {
    if (!isoString || isoString.startsWith('0001-01-01')) return '—';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  const commandStr = config.cmd ? config.cmd.join(' ') : (inspect.path ? `${inspect.path} ${(inspect.args || []).join(' ')}` : '—');
  const entrypointStr = config.entrypoint ? config.entrypoint.join(' ') : '—';

  return (
    <div className="space-y-4">
      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 surface rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#9ba0b5] uppercase tracking-wider">
            {t('containers.quickActions')}:
          </span>
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={onStart}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#34d399] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t('containers.start')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStop}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#f87171] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  {t('containers.stop')}
                </button>
              )}

              <button
                type="button"
                onClick={onRestart}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#eceef6] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#9ba0b5]" />
                {t('containers.restart')}
              </button>

              {isRunning && (
                isPaused ? (
                  <button
                    type="button"
                    onClick={onUnpause}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#34d399] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t('containers.resume')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPause}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#fbbf24] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    {t('containers.pause')}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && isRunning && (
            <button
              type="button"
              onClick={onOpenTerminal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 rounded-xl transition-colors cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              {t('containers.openTerminal')}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#eceef6] bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#9ba0b5]" />
            {t('containers.viewLogs')}
          </button>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Full ID Card */}
        <div className="p-4 surface rounded-2xl border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#9ba0b5]">
            <span>{t('containers.containerIdFull')}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer"
              title="Kopyala"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-xs text-[#eceef6] break-all select-all">
            {inspect.id}
          </div>
        </div>

        {/* Image Card */}
        <div className="p-4 surface rounded-2xl border border-white/10 space-y-1.5">
          <div className="text-xs text-[#9ba0b5]">{t('containers.image')}</div>
          <div className="font-mono text-xs text-[#eceef6] break-all font-semibold">
            {inspect.config?.image || inspect.image || '—'}
          </div>
        </div>

        {/* State & Health */}
        <div className="p-4 surface rounded-2xl border border-white/10 space-y-2">
          <div className="text-xs text-[#9ba0b5]">{t('containers.statusHeader')}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {statusStr}
            </span>

            {state.health?.status && (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Sağlık: {state.health.status}
              </span>
            )}

            {state.exitCode !== undefined && state.exitCode !== 0 && (
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                Exit: {state.exitCode}
              </span>
            )}
          </div>
        </div>

        {/* Restart Policy */}
        <div className="p-4 surface rounded-2xl border border-white/10 space-y-1.5">
          <div className="text-xs text-[#9ba0b5]">{t('containers.restartPolicyLabel')}</div>
          <div className="text-xs font-bold text-[#eceef6]">
            {hostConfig.restartPolicy?.name || 'no'}
          </div>
        </div>
      </div>

      {/* Execution Environment */}
      <div className="p-5 surface rounded-2xl border border-white/10 space-y-3">
        <h4 className="text-xs font-bold text-[#eceef6] uppercase tracking-wider">
          Çalışma Zamanı Yapılandırması
        </h4>
        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-white/10 pb-2">
            <span className="text-[#9ba0b5]">{t('containers.command')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6] break-all">{commandStr}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-white/10 pb-2">
            <span className="text-[#9ba0b5]">{t('containers.entrypoint')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6] break-all">{entrypointStr}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-white/10 pb-2">
            <span className="text-[#9ba0b5]">{t('containers.workdir')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6]">{config.workingDir || '—'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
            <span className="text-[#9ba0b5]">{t('containers.user')}</span>
            <span className="md:col-span-3 font-mono text-[#eceef6]">{config.user || 'root (varsayılan)'}</span>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="p-5 surface rounded-2xl border border-white/10 space-y-3 text-xs">
        <h4 className="font-bold text-[#eceef6] uppercase tracking-wider">
          Zaman Damgaları
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-[#9ba0b5] block mb-0.5">{t('containers.createdTime')}</span>
            <span className="text-[#eceef6] font-mono">{formatDate(inspect.created)}</span>
          </div>
          <div>
            <span className="text-[#9ba0b5] block mb-0.5">{t('containers.startedTime')}</span>
            <span className="text-[#eceef6] font-mono">{formatDate(inspect.state?.startedAt)}</span>
          </div>
          <div>
            <span className="text-[#9ba0b5] block mb-0.5">{t('containers.finishedTime')}</span>
            <span className="text-[#eceef6] font-mono">{formatDate(inspect.state?.finishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
