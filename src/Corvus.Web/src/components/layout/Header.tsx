import React, { useState, useEffect } from 'react';
import { RefreshCw, Moon, Sun, User as UserIcon } from 'lucide-react';
import { StatusDot } from '../ui/StatusDot';
import { LanguageSwitch } from '../LanguageSwitch';
import { useI18n } from '../../i18n';
import { getThemeMode, toggleThemeMode } from '../../lib/motion';
import type { PageId } from '../Sidebar';

export interface HeaderProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  activeSystemName?: string | null;
  activeSystemIp?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  username?: string | null;
  role?: string | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onSelectPage,
  activeSystemName,
  activeSystemIp,
  onRefresh,
  isRefreshing = false,
  username,
  onLogout: _onLogout,
}) => {
  const { t } = useI18n();
  const [themeMode, setThemeState] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setThemeState(getThemeMode());

    const handleThemeChanged = (e: Event) => {
      const custom = e as CustomEvent<'dark' | 'light'>;
      setThemeState(custom.detail);
    };

    window.addEventListener('corvus_theme_changed', handleThemeChanged);

    return () => {
      window.removeEventListener('corvus_theme_changed', handleThemeChanged);
    };
  }, []);

  const handleToggleTheme = () => {
    const next = toggleThemeMode();
    setThemeState(next);
  };

  const pageTitleMap: Record<PageId, string> = {
    dashboard: t('nav.dashboard') || 'Kontrol Paneli',
    services: t('nav.services') || 'Servisler',
    containers: t('nav.containers') || 'Konteynerler',
    deployments: t('deployments.title') || 'Dağıtım Merkezi',
    systems: t('nav.systems') || 'Sistemler',
    metrics: t('nav.metrics') || 'Sistem Metrikleri',
    uptime: t('nav.uptime') || 'Uptime',
    activity: t('nav.activity') || 'Olay Geçmişi',
    settings: t('nav.settings') || 'Ayarlar',
    profile: t('nav.profile') || 'Profil ve Kullanıcılar',
  };

  const currentTitle = pageTitleMap[currentPage] || 'Corvus';
  const displayHost = activeSystemName || 'Host';
  const displayContext = activeSystemIp ? `${displayHost} (${activeSystemIp})` : displayHost;

  return (
    <header className="header">
      {/* Left: Page Title + Context */}
      <div className="header-left min-w-0">
        <h1 className="page-title truncate">{currentTitle}</h1>
        {currentPage !== 'systems' && (
          <>
            <span style={{ color: 'var(--border-strong)' }}>/</span>
            <div className="header-context truncate">
              <StatusDot status="up" size={6} />
              <span className="truncate">{displayContext}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Refresh, Theme, Language, Profile */}
      <div className="header-actions">
        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn btn-sm"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={handleToggleTheme}
          className="btn btn-sm"
          title={t('common.themeToggle')}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
          <span className="hidden md:inline">{themeMode === 'dark' ? t('common.themeLight') : t('common.themeDark')}</span>
        </button>

        {/* Language switch */}
        <div className="hidden sm:block">
          <LanguageSwitch />
        </div>

        {/* Profile button */}
        <button
          type="button"
          onClick={() => onSelectPage('profile')}
          className={`btn btn-sm ${currentPage === 'profile' ? 'btn-cloud' : ''}`}
          title={t('nav.userProfile')}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-mono">{username || t('common.user')}</span>
        </button>
      </div>
    </header>
  );
};
