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
  PanelLeftClose,
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onSelectPage,
  username,
  role,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
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

  return (
    <aside
      className={`
        hidden lg:flex flex-col h-screen fixed left-0 top-0 select-none z-40
        w-64 bg-[#1b1d2a] border-r border-white/10
        transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]
        ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}
      `}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <img 
            src="/logo_transparent.png" 
            alt="Corvus" 
            className="w-8 h-8 object-contain shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-bold text-base tracking-wider text-[#eceef6] leading-tight font-mono">
            CORVUS
          </span>
        </div>

        {/* Kenar Çubuğunu Kapatma / Daraltma Butonu */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Menüyü Gizle"
            aria-label="Menüyü Gizle"
            className="p-1.5 rounded-lg text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
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
              onClick={() => onSelectPage(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-200 cursor-pointer outline-none active:scale-[0.97]
                ${
                  isActive
                    ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs font-bold'
                    : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08]'
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        {isStatusLinkVisible && (
          <div className="pt-2 mt-2 border-t border-white/10">
            <a
              href="/status"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors"
            >
              <span>{t('nav.liveStatus')}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0d0e15] border border-white/10 text-slate-400 font-mono">
                /status
              </span>
            </a>
          </div>
        )}
      </nav>

      {/* User Profile Footer */}
      {username && (
        <div className="p-3 border-t border-white/10 bg-[#0d0e15]/40">
          <div
            className={`
              flex items-center justify-between border rounded-2xl px-2.5 py-2 transition-all
              ${
                currentPage === 'profile'
                  ? 'bg-white/10 border-white/20'
                  : 'bg-[#1b1d2a] border-white/10 hover:border-white/20'
              }
            `}
          >
            <button
              type="button"
              onClick={() => onSelectPage('profile')}
              className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-90 transition-opacity cursor-pointer flex-1 min-w-0 pr-2 group"
              title={t('userManagement.openProfile')}
            >
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center shrink-0 border
                  ${
                    currentPage === 'profile'
                      ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200'
                      : 'bg-white/10 border-white/15 text-[#d5d5dc]'
                  }
                `}
              >
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#eceef6] truncate">
                  {username}
                </span>
                <span className="text-[10px] text-[#9ba0b5] uppercase tracking-wider font-mono">
                  {role === 'admin' ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}
                </span>
              </div>
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title={t('nav.logout')}
                className="text-[#9ba0b5] hover:text-[#f87171] p-1.5 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Version & Language Switch Footer */}
      <div className="px-3.5 py-2.5 border-t border-white/10 bg-[#0d0e15]/30 flex items-center justify-between text-[11px] text-[#9ba0b5]">
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/brhnshn/corvus/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono hover:text-[#eceef6] transition-colors"
          >
            <span>Corvus</span>
            <span className="text-[#eceef6] font-semibold">
              {versionInfo ? `v${versionInfo.currentVersion}` : '...'}
            </span>
          </a>

          {versionInfo?.isUpdateAvailable && (
            <a
              href={versionInfo.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t('nav.updateAvailable')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-[#34d399] hover:bg-emerald-900 transition-colors text-[9px] font-medium"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#34d399]"></span>
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
