import React from 'react';
import { useI18n } from '../../../i18n';
import { Play, Square, RotateCw, Pause, Terminal, FileText, Copy, Check } from 'lucide-react';
import type { DockerContainerInspectInfo, DockerContainer } from '../../../types';

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

  const handleCopyId = () => {
    navigator.clipboard.writeText(inspect.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isRunning = inspect.state?.running ?? false;
  const isPaused = inspect.state?.paused ?? false;
  const statusStr = inspect.state?.status ?? 'unknown';

  const formatDate = (isoString?: string) => {
    if (!isoString || isoString.startsWith('0001-01-01')) return '—';
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return isoString;
    }
  };

  const commandStr = inspect.config?.cmd ? inspect.config.cmd.join(' ') : (inspect.path ? `${inspect.path} ${(inspect.args || []).join(' ')}` : '—');
  const entrypointStr = inspect.config?.entrypoint ? inspect.config.entrypoint.join(' ') : '—';

  return (
    <div className="space-y-6">
      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('containers.quickActions')}:
          </span>
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={onStart}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  {t('containers.start')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStop}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5" />
                  {t('containers.stop')}
                </button>
              )}

              <button
                type="button"
                onClick={onRestart}
                disabled={actionLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {t('containers.restart')}
              </button>

              {isRunning && (
                isPaused ? (
                  <button
                    type="button"
                    onClick={onUnpause}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t('containers.resume')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPause}
                    disabled={actionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
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
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              {t('containers.openTerminal')}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenLogs}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {t('containers.viewLogs')}
          </button>
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full ID Card */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{t('containers.containerIdFull')}</span>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copy"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="font-mono text-xs text-slate-200 break-all select-all">
            {inspect.id}
          </div>
        </div>

        {/* Image Card */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">{t('containers.image')}</div>
          <div className="font-mono text-xs text-blue-400 break-all font-medium">
            {inspect.config?.image || inspect.image || '—'}
          </div>
        </div>

        {/* State & Health */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2">
          <div className="text-xs text-slate-400">{t('containers.statusHeader')}</div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                isRunning
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              {statusStr}
            </span>

            {inspect.state?.health?.status && (
              <span className="text-xs font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                Health: {inspect.state.health.status}
              </span>
            )}

            {inspect.state?.exitCode !== undefined && inspect.state.exitCode !== 0 && (
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                Exit: {inspect.state.exitCode}
              </span>
            )}
          </div>
        </div>

        {/* Restart Policy */}
        <div className="p-3.5 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">{t('containers.restartPolicyLabel')}</div>
          <div className="text-xs font-semibold text-slate-200">
            {inspect.hostConfig?.restartPolicy?.name || 'no'}
          </div>
        </div>
      </div>

      {/* Execution Environment */}
      <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Runtime Configuration
        </h4>
        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">{t('containers.command')}</span>
            <span className="md:col-span-3 font-mono text-slate-200 break-all">{commandStr}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">{t('containers.entrypoint')}</span>
            <span className="md:col-span-3 font-mono text-slate-200 break-all">{entrypointStr}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4 border-b border-slate-800/60 pb-2">
            <span className="text-slate-400">{t('containers.workdir')}</span>
            <span className="md:col-span-3 font-mono text-slate-200">{inspect.config?.workingDir || '—'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
            <span className="text-slate-400">{t('containers.user')}</span>
            <span className="md:col-span-3 font-mono text-slate-200">{inspect.config?.user || 'root (default)'}</span>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2.5 text-xs">
        <h4 className="font-semibold text-slate-300 uppercase tracking-wider">
          Timestamps
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-400 block">{t('containers.createdTime')}</span>
            <span className="text-slate-200 font-mono">{formatDate(inspect.created)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">{t('containers.startedTime')}</span>
            <span className="text-slate-200 font-mono">{formatDate(inspect.state?.startedAt)}</span>
          </div>
          <div>
            <span className="text-slate-400 block">{t('containers.finishedTime')}</span>
            <span className="text-slate-200 font-mono">{formatDate(inspect.state?.finishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
