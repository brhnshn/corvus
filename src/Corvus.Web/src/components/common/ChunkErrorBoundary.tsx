import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface ChunkErrorBoundaryProps {
  children: React.ReactNode;
}

interface ChunkErrorBoundaryInnerProps extends ChunkErrorBoundaryProps {
  t: (key: any) => string;
}

export interface ChunkErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
  errorMessage?: string;
}

class ChunkErrorBoundaryInner extends React.Component<ChunkErrorBoundaryInnerProps, ChunkErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryInnerProps) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
  }

  static getDerivedStateFromError(error: any): ChunkErrorBoundaryState {
    const msg = error?.message || String(error || '');
    const isChunk =
      error?.name === 'ChunkLoadError' ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('dynamically imported module');
    return { hasError: true, isChunkError: isChunk, errorMessage: msg };
  }

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-md sheet-glass border border-white/10 rounded-[28px] p-8 space-y-4 shadow-2xl">
              <RefreshCw className="w-10 h-10 text-white mx-auto animate-spin" />
              <h2 className="text-lg font-bold text-white">{t('errorBoundary.newVersionDetected')}</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                {t('errorBoundary.newVersionDesc')}
              </p>
              <button
                onClick={() => {
                  window.sessionStorage.removeItem('chunk_reload_retry');
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-white hover:bg-white/90 rounded-xl text-xs font-semibold text-black transition-all cursor-pointer shadow-md"
              >
                {t('errorBoundary.reloadPage')}
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md bg-[#161824] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-semibold text-red-400">{t('errorBoundary.uiErrorTitle')}</h2>
            <p className="text-xs text-[#9ba0b5] leading-relaxed font-mono break-words">
              {this.state.errorMessage || t('errorBoundary.unexpectedError')}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, isChunkError: false })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-white transition-all cursor-pointer"
              >
                {t('errorBoundary.retry')}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white hover:bg-white/90 rounded-xl text-xs font-semibold text-black transition-all cursor-pointer"
              >
                {t('errorBoundary.reloadPage')}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ChunkErrorBoundary: React.FC<ChunkErrorBoundaryProps> = ({ children }) => {
  const { t } = useI18n();
  return <ChunkErrorBoundaryInner t={t}>{children}</ChunkErrorBoundaryInner>;
};

