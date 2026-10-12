import React, { useEffect, useRef } from 'react';
import { Search, Plus, RefreshCw, User as UserIcon } from 'lucide-react';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { useI18n } from '../../i18n';

interface SystemsNavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  onAddClick: () => void;
  onOpenProfile?: () => void;
  isAdmin: boolean;
}

export const SystemsNavbar: React.FC<SystemsNavbarProps> = ({
  searchQuery,
  onSearchChange,
  onRefresh,
  isLoading,
  onAddClick,
  onOpenProfile,
  isAdmin
}) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            {t('systems.fleet')}
          </span>
        </div>
      </div>

      {/* Orta: Arama Çubuğu (Ctrl+K ile Gerçekten Odaklanan Fonksiyonel Arama) */}
      <div className="flex-1 max-w-md mx-2 sm:mx-6">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#9ba0b5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('systems.searchPlaceholder')}
            className="w-full pl-9 pr-14 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] focus:bg-white/[0.09] border border-white/10 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
          />
          <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono rounded bg-white/10 border border-white/10 text-[#9ba0b5] pointer-events-none">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Sağ: Aksiyonlar & Araçlar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Canlı Yenileme Butonu */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          title={t('common.refresh')}
          className="p-2 rounded-xl text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        {/* Dil Seçici (TR / EN) */}
        <div className="hidden sm:block">
          <LanguageSwitch variant="compact" />
        </div>

        {/* Kullanıcı Ayarları / Profil Butonu */}
        {onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            title={t('userManagement.openProfile')}
            className="p-2 rounded-xl text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <UserIcon className="w-4 h-4" />
          </button>
        )}

        {/* + Sistem Ekle Butonu */}
        {isAdmin && (
          <button
            type="button"
            onClick={onAddClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#d5d5dc] hover:bg-white text-[#12131c] text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t('systems.addSystemButton')}</span>
          </button>
        )}
      </div>
    </header>
  );
};
