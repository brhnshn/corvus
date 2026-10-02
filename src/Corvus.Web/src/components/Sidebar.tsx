import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Grid, 
  Boxes, 
  Activity, 
  Clock, 
  Settings, 
  User as UserIcon, 
  LogOut
} from 'lucide-react';
import { api, type VersionInfo } from '../api/client';
import { useI18n } from '../i18n';
import { LanguageSwitch } from './LanguageSwitch';

export type PageId = 'dashboard' | 'services' | 'containers' | 'metrics' | 'uptime' | 'settings' | 'profile';

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
    <aside className="hidden lg:flex w-64 bg-[#1a1d29] border-r border-[#2a2e3f] flex-col h-screen fixed left-0 top-0 select-none z-50">
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
            <div className={`flex items-center justify-between border rounded-lg px-2.5 py-2 transition-all ${
              currentPage === 'profile'
                ? 'bg-indigo-500/10 border-indigo-500/50 shadow-xs'
                : 'bg-[#1a1d29] border-[#2a2e3f] hover:border-[#3f4458]'
            }`}>
              <button
                type="button"
                onClick={() => onSelectPage('profile')}
                className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-90 transition-opacity cursor-pointer flex-1 min-w-0 pr-2 group"
                title={t('userManagement.openProfile')}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 border ${
                  currentPage === 'profile'
                    ? 'bg-indigo-500/25 border-indigo-500/50 text-indigo-300'
                    : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                }`}>
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#e5e7eb] truncate group-hover:text-indigo-300 transition-colors">
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
    );
};
