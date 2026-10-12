import React from 'react';
import { Search, Plus, Bell, RefreshCw } from 'lucide-react';
import { LanguageSwitch } from '../../components/LanguageSwitch';

interface SystemsNavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onAddClick: () => void;
  isAdmin: boolean;
  alertCount?: number;
}

export const SystemsNavbar: React.FC<SystemsNavbarProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading,
  onAddClick,
  isAdmin,
  alertCount = 0
}) => {

  return (
    <header className="h-16 border-b border-white/10 bg-[#161824]/90 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Sol: Corvus Logosu & Başlık */}
      <div className="flex items-center gap-3 shrink-0">
        <img
          src="/logo_transparent.png"
          alt="Corvus"
          className="w-8 h-8 object-contain"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="flex items-center gap-2">
          <span className="font-bold text-base tracking-wider text-[#eceef6] font-mono leading-none">
            CORVUS
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono text-[#9ba0b5] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
            Sistem Filosu
          </span>
        </div>
      </div>

      {/* Orta: Arama Çubuğu (Beszel Tarzı Ctrl+K / Arama) */}
      <div className="flex-1 max-w-md mx-2 sm:mx-6">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#9ba0b5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Sistem ara..."
            className="w-full pl-9 pr-14 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/10 border border-white/10 text-[#9ba0b5]">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Sağ: Aksiyonlar & Araçlar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Yenile butonu */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Yenile"
          className="p-2 rounded-xl text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        {/* Uyarılar rozeti (Beszel tarzı) */}
        {alertCount > 0 && (
          <div className="relative">
            <button
              type="button"
              title={`${alertCount} Aktif Uyarı`}
              className="p-2 rounded-xl text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </button>
          </div>
        )}

        {/* Dil Seçici */}
        <div className="hidden sm:block">
          <LanguageSwitch variant="compact" />
        </div>

        {/* + Sistem Ekle Butonu (Beszel'deki gibi sağ üstte odak buton) */}
        {isAdmin && (
          <button
            type="button"
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#d5d5dc] hover:bg-white text-[#12131c] text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Sistem ekle</span>
          </button>
        )}
      </div>
    </header>
  );
};
