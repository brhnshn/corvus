import React, { useEffect } from 'react';
import { Search, RefreshCw, User as UserIcon, Server, PanelLeftOpen } from 'lucide-react';
import { LanguageSwitch } from '../LanguageSwitch';
import { useI18n } from '../../i18n';
import type { PageId } from '../Sidebar';

export interface NavbarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onOpenCommandPalette?: () => void;
  username?: string | null;
  role?: string | null;
  activeSystemName?: string | null;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onSelectPage,
  onRefresh,
  isRefreshing = false,
  onOpenCommandPalette,
  username,
  activeSystemName,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const { t } = useI18n();
  const isFleetView = currentPage === 'systems';

  // Global Ctrl+K / Cmd+K dinleyicisi
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  return (
    <header className="h-16 border-b border-white/10 bg-[#161824]/90 backdrop-blur-xl sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 select-none">
      {/* Sol: Logo + Sistem Başlığı veya Geri Dönüş Breadcrumb */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {/* Sidebar kapalıyken kenar çubuğunu açma butonu */}
        {!isFleetView && isSidebarCollapsed && onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title="Menüyü Göster"
            aria-label="Menüyü Göster"
            className="p-1.5 rounded-xl text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        {/* Corvus Logo & Filo Ana Bağlantısı */}
        <button
          type="button"
          onClick={() => onSelectPage('systems')}
          className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer group text-left"
          title={t('nav.backToSystems')}
        >
          <img
            src="/logo_transparent.png"
            alt="Corvus"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-bold text-sm sm:text-base tracking-wider text-[#eceef6] font-mono leading-none">
            CORVUS
          </span>
        </button>

        {/* Konum Rozeti veya Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-[#9ba0b5]/50">/</span>
          {isFleetView ? (
            <span className="text-[11px] font-mono text-[#eceef6] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
              {t('systems.fleet')}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSelectPage('systems')}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/20 text-indigo-300 transition-colors cursor-pointer"
              title={t('nav.backToSystems')}
            >
              <Server className="w-3 h-3 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[180px]">
                {activeSystemName || 'Yerel Sunucu'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Orta: Arama / Komut Paleti */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-[#9ba0b5] hover:text-[#eceef6] transition-all cursor-pointer font-mono group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#9ba0b5] group-hover:text-[#eceef6] transition-colors" />
              <span className="truncate">{t('systems.searchPlaceholder')}</span>
            </div>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono rounded bg-white/10 border border-white/10 text-[#9ba0b5]">
              Ctrl K
            </kbd>
          </button>
        )}
      </div>

      {/* Sağ: Aksiyonlar & Araçlar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Canlı Yenileme */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title={t('common.refresh')}
            className="p-2 rounded-xl text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        )}

        {/* Dil Değiştirici */}
        <div className="hidden sm:block">
          <LanguageSwitch variant="compact" />
        </div>

        {/* Profil Sayfasına Yönlendiren Buton (URL: /profile) */}
        <button
          type="button"
          onClick={() => onSelectPage('profile')}
          title={t('userManagement.openProfile')}
          className={`
            flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer
            ${
              currentPage === 'profile'
                ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-[#9ba0b5] hover:text-[#eceef6]'
            }
          `}
        >
          <UserIcon className="w-4 h-4 shrink-0" />
          {username && (
            <span className="hidden md:inline-block text-xs font-semibold max-w-[100px] truncate">
              {username}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
