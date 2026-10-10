import React from 'react';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  RotateCw, 
  Pause, 
  Terminal as TerminalIcon, 
  FileText, 
  Loader2
} from 'lucide-react';
import type { DockerContainer } from '../../types';
import { useI18n } from '../../i18n';
import type { ContainerDetailTab } from './types';

interface ContainerDetailHeaderProps {
  container: DockerContainer | null;
  containerId: string;
  onBack: () => void;
  actionInProgress: string | null;
  onAction: (action: 'start' | 'stop' | 'pause' | 'unpause' | 'restart') => void;
  activeTab: ContainerDetailTab;
  onSelectTab: (tab: ContainerDetailTab) => void;
  isAdmin?: boolean;
}

export const ContainerDetailHeader: React.FC<ContainerDetailHeaderProps> = ({
  container,
  containerId,
  onBack,
  actionInProgress,
  onAction,
  activeTab,
  onSelectTab,
  isAdmin = true
}) => {
  const { t } = useI18n();

  const name = container?.Names?.[0]?.replace(/^\//, '') || containerId.slice(0, 12);
  const image = container?.Image || 'Bilinmiyor';
  const state = container?.State?.toLowerCase() || 'unknown';
  const status = container?.Status || '';
  const isRunning = state === 'running';
  const isPaused = state === 'paused';

  return (
    <div className="space-y-4">
      {/* Geri Navigasyon Butonu */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer group py-1"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>{t('containers.backToList') || 'Tüm Konteynerler'}</span>
        </button>
      </div>

      {/* Ana Başlık ve Aksiyon Barı */}
      <div className="surface rounded-[24px] p-5 sm:p-6 border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 animate-rv shadow-xl">
        {/* Sol Taraf: İsim, Durum, İmaj & ID */}
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isRunning ? 'bg-[#34d399] animate-dot-pulse' : isPaused ? 'bg-[#fbbf24]' : 'bg-[#f87171]'
              }`}
            />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#eceef6] truncate">
              {name}
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                isRunning
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isPaused
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}
            >
              {isRunning
                ? 'Çalışıyor'
                : isPaused
                ? 'Duraklatıldı'
                : 'Durdu'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9ba0b5] font-mono">
            <span className="truncate max-w-[320px] text-white/70" title={image}>
              {image}
            </span>
            <span className="text-white/20">•</span>
            <span>ID: {containerId.slice(0, 12)}</span>
            {status && (
              <>
                <span className="text-white/20">•</span>
                <span className="text-white/60">{status}</span>
              </>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Yaşam Döngüsü Butonları ve Hızlı Sekme Kısayolları */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
          {isRunning && (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('logs')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t('containers.tabLogs') || 'Canlı Loglar'}</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('terminal')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'terminal'
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>{t('containers.tabTerminal') || 'Web Terminali'}</span>
              </button>
            </>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-white/10 ml-1">
              {isRunning && (
                <>
                  <button
                    type="button"
                    disabled={!!actionInProgress}
                    onClick={() => onAction('restart')}
                    title={t('containers.actionRestart') || 'Yeniden Başlat'}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionInProgress === 'restart' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    ) : (
                      <RotateCw className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!!actionInProgress}
                    onClick={() => onAction('pause')}
                    title={t('containers.actionPause') || 'Duraklat'}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionInProgress === 'pause' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!!actionInProgress}
                    onClick={() => onAction('stop')}
                    title={t('containers.actionStop') || 'Durdur'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {actionInProgress === 'stop' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                    <span>{t('containers.actionStop') || 'Durdur'}</span>
                  </button>
                </>
              )}

              {isPaused && (
                <button
                  type="button"
                  disabled={!!actionInProgress}
                  onClick={() => onAction('unpause')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {actionInProgress === 'unpause' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Devam Ettir</span>
                </button>
              )}

              {!isRunning && !isPaused && (
                <button
                  type="button"
                  disabled={!!actionInProgress}
                  onClick={() => onAction('start')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {actionInProgress === 'start' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Başlat</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
