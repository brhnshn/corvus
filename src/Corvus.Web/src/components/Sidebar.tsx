import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Grid, 
  Boxes, 
  Activity, 
  Clock, 
  Settings, 
  User as UserIcon, 
  LogOut,
  X
} from 'lucide-react';
import { api, type VersionInfo } from '../api/client';
import { useI18n } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';
import { UserProfileModal } from './UserProfileModal';

export type PageId = 'dashboard' | 'services' | 'containers' | 'metrics' | 'uptime' | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  username?: string | null;
  role?: string | null;
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onSelectPage,
  username,
  role,
  onLogout,
  isOpen = false,
  onClose
}) => {
  const [versionInfo, setVersionInfo] = React.useState<VersionInfo | null>(null);
  const [isStatusLinkVisible, setIsStatusLinkVisible] = React.useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState<boolean>(false);
  const { t } = useI18n();

  useEffect(() => {
    api.getVersion().then(setVersionInfo).catch(() => {});
    api.getPublicStatusPage()
      .then(res => setIsStatusLinkVisible(Boolean(res.enabled && res.services && res.services.length > 0)))
      .catch(() => setIsStatusLinkVisible(false));
  }, []);
  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'services', label: t('nav.services'), icon: Grid },
    { id: 'containers', label: t('nav.containers'), icon: Boxes },
    { id: 'metrics', label: t('nav.metrics'), icon: Activity },
    { id: 'uptime', label: t('nav.uptime'), icon: Clock },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ] as const;

  // ESC tuşuna basıldığında drawer'ı kapat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemClick = (id: PageId) => {
    onSelectPage(id);
    onClose?.();
  };

  return (
    <>
      {/* Mobil & Tablet Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Drawer */}
      <aside 
        className={`w-64 bg-[#1a1d29] border-r border-[#2a2e3f] flex flex-col h-screen fixed left-0 top-0 select-none z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#2a2e3f]">
          <div className="flex items-center gap-3">
            <img 
              src="/logo_transparent.png" 
              alt="Corvus" 
              className="w-9 h-9 object-contain shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="font-bold text-lg tracking-wider text-[#e5e7eb] leading-tight">CORVUS</span>
          </div>

          {/* Mobil & Tablet Kapatma Butonu */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden text-[#9ca3af] hover:text-[#e5e7eb] p-1.5 rounded-lg hover:bg-[#1e2130] transition-colors cursor-pointer"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#d4d4d8] text-[#0f1117] font-semibold shadow-sm'
                    : 'text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}

          {isStatusLinkVisible && (
            <div className="pt-2 mt-2 border-t border-[#2a2e3f]/60">
              <a
                href="/status"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130] transition-colors"
              >
                <span>{t('nav.liveStatus')}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0f1117] border border-[#2a2e3f] text-slate-400 font-mono">/status</span>
              </a>
            </div>
          )}
        </nav>

        {/* User Profile Footer */}
        {username && (
          <div className="p-3.5 border-t border-[#2a2e3f] bg-[#0f1117]/50">
            <div className="flex items-center justify-between bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-2.5 py-2">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-85 transition-opacity cursor-pointer flex-1 min-w-0 pr-2 group"
                title={t('userManagement.openProfile')}
              >
                <div className="w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#e5e7eb] truncate group-hover:text-purple-300 transition-colors">
                    {username}
                  </span>
                  <span className="text-[10px] text-[#9ca3af] uppercase tracking-wider font-mono">
                    {role === 'admin' ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}
                  </span>
                </div>
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title={t('nav.logout')}
                  className="text-[#9ca3af] hover:text-[#ef4444] p-1.5 rounded transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Version & Language Switch Footer */}
        <div className="px-3.5 py-2.5 border-t border-[#2a2e3f] bg-[#0f1117]/30 flex items-center justify-between text-[11px] text-[#9ca3af]">
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/brhnshn/corvus/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono hover:text-[#e5e7eb] transition-colors"
            >
              <span>Corvus</span>
              <span className="text-[#e5e7eb] font-semibold">
                {versionInfo ? `v${versionInfo.currentVersion}` : '...'}
              </span>
            </a>

            {versionInfo?.isUpdateAvailable && (
              <a
                href={versionInfo.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t('nav.updateAvailable')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 hover:bg-emerald-900 transition-colors text-[9px] font-medium"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>v{versionInfo.latestVersion}</span>
              </a>
            )}
          </div>

          <LanguageSwitch variant="compact" />
        </div>
      </aside>

      {username && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUsername={username}
          currentRole={role}
        />
      )}
    </>
  );
};
