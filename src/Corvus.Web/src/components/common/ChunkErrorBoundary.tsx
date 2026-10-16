import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface ChunkErrorBoundaryProps {
  children: React.ReactNode;
}

export interface ChunkErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
  errorMessage?: string;
}

export class ChunkErrorBoundary extends React.Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryProps) {
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
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-full max-w-md sheet-glass border border-white/10 rounded-[28px] p-8 space-y-4 shadow-2xl">
              <RefreshCw className="w-10 h-10 text-white mx-auto animate-spin" />
              <h2 className="text-lg font-bold text-white">Yeni Sürüm Algılandı</h2>
              <p className="text-xs text-white/60 leading-relaxed">
                Sistem güncellendiği için sayfanın taze varlıklarla yeniden yüklenmesi gerekiyor.
              </p>
              <button
                onClick={() => {
                  window.sessionStorage.removeItem('chunk_reload_retry');
                  window.location.reload();
                }}
                className="px-5 py-2.5 bg-white hover:bg-white/90 rounded-xl text-xs font-semibold text-black transition-all cursor-pointer shadow-md"
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md bg-[#161824] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h2 className="text-base font-semibold text-red-400">Bir Arayüz Hatası Oluştu</h2>
            <p className="text-xs text-[#9ba0b5] leading-relaxed font-mono break-words">
              {this.state.errorMessage || 'Beklenmeyen bir bileşen hatası meydana geldi.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, isChunkError: false })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-white transition-all cursor-pointer"
              >
                Yeniden Dene
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white hover:bg-white/90 rounded-xl text-xs font-semibold text-black transition-all cursor-pointer"
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
