import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  Grid, 
  Boxes, 
  Activity, 
  Clock, 
  Settings, 
  Search,
  History,
  Terminal,
  Server,
  ArrowLeftRight,
  Rocket
} from 'lucide-react';
import { StatusDot } from './ui/StatusDot';
import { api, type VersionInfo } from '../api/client';
import { useI18n } from '../i18n';
import { systemStatusToDot } from '../hooks/useActiveSystemStatus';
import type { SystemStatus } from '../types/systems';

export type PageId = 'dashboard' | 'services' | 'containers' | 'deployments' | 'systems' | 'metrics' | 'uptime' | 'activity' | 'settings' | 'profile';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isCollapsed?: boolean;
  onOpenCommandPalette?: () => void;
  activeSystemName?: string | null;
  activeSystemStatus?: SystemStatus | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  isCollapsed = false,
  onOpenCommandPalette,
  activeSystemName = 'Host',
  activeSystemStatus = null,
}) => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 232;
    const stored = localStorage.getItem('corvus_sidebar_w');
    return stored ? parseInt(stored, 10) || 232 : 232;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [hoverPill, setHoverPill] = useState<{ top: number; opacity: number }>({ top: 0, opacity: 0 });
  const [activePill, setActivePill] = useState<{ top: number; opacity: number }>({ top: 0, opacity: 0 });

  const navRef = useRef<HTMLElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    api.getVersion().then(setVersionInfo).catch(() => {});
  }, []);

  // Update active pill position when currentPage changes
  const updateActivePill = useCallback(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector<HTMLButtonElement>(`button[data-nav="${currentPage}"]`);
    if (activeBtn) {
      setActivePill({ top: activeBtn.offsetTop, opacity: 1 });
    } else {
      setActivePill((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [currentPage]);

  useEffect(() => {
    updateActivePill();
  }, [updateActivePill, sidebarWidth]);

  // Resizer drag event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const clamped = Math.max(184, Math.min(320, e.clientX));
      setSidebarWidth(clamped);
      document.documentElement.style.setProperty('--sidebar-w', `${clamped}px`);
      localStorage.setItem('corvus_sidebar_w', String(clamped));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleDoubleClickResizer = () => {
    setSidebarWidth(232);
    document.documentElement.style.setProperty('--sidebar-w', '232px');
    localStorage.setItem('corvus_sidebar_w', '232');
  };

  const handleMouseEnterButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    const top = e.currentTarget.offsetTop;
    setHoverPill({ top, opacity: 1 });
  };

  const handleMouseLeaveNav = () => {
    setHoverPill((prev) => ({ ...prev, opacity: 0 }));
  };

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'services', label: t('nav.services'), icon: Grid },
    { id: 'containers', label: t('nav.containers'), icon: Boxes },
    { id: 'deployments', label: t('nav.deployments'), icon: Rocket },
    { id: 'metrics', label: t('nav.metrics'), icon: Activity },
    { id: 'uptime', label: t('nav.uptime'), icon: Clock },
    { id: 'activity', label: t('nav.activity'), icon: History },
  ] as const;

  return (
    <aside
      className={`sidebar ${isCollapsed ? '-translate-x-full lg:translate-x-0' : ''}`}
      style={{ width: `${sidebarWidth}px` }}
      aria-label={t('nav.navigation')}
    >
      {/* Sidebar Draggable Resizer */}
      <div
        className={`sidebar-resizer ${isResizing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClickResizer}
        title={t('nav.dragSidebar')}
      />

      {/* Top: Brand & Command Search */}
      <div className="sidebar-top">
        <div className="brand-row">
          <div className="brand">
            <img
              src="/logo_transparent.png"
              alt="Corvus"
              className="w-5 h-5 object-contain select-none shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span>CORVUS</span>
          </div>
          <span className="mono text-[11px] text-[var(--text-muted)]">AOT</span>
        </div>

        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="cmd-trigger"
            onClick={onOpenCommandPalette}
            title={t('nav.openCommandPalette')}
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>{t('common.search')}</span>
            </span>
            <span className="kbd">Ctrl K</span>
          </button>
        )}
      </div>

      {/* Navigation List with Gliding Hover & Active Pills */}
      <nav
        ref={navRef}
        className="nav-list"
        onMouseLeave={handleMouseLeaveNav}
      >
        {/* Hover Pill (Follows cursor smoothly) */}
        <div
          className="nav-hover-pill"
          style={{
            transform: `translateY(${hoverPill.top}px)`,
            opacity: hoverPill.opacity,
          }}
        />

        {/* Active Pill (Anchored to current active page) */}
        <div
          className="nav-active-pill"
          style={{
            transform: `translateY(${activePill.top}px)`,
            opacity: activePill.opacity,
          }}
        />

        {/* Fleet Section */}
        <div className="nav-section-title">{t('nav.allSystems')}</div>
        <button
          type="button"
          data-nav="systems"
          onClick={() => onSelectPage('systems')}
          onMouseEnter={handleMouseEnterButton}
          className={`nav-btn ${currentPage === 'systems' ? 'active' : ''}`}
        >
          <span className="nav-btn-left">
            <Server className="w-4 h-4" />
            <span>{t('nav.fleet')}</span>
          </span>
        </button>

        {/* Node Scope Section Header */}
        <div className="nav-section-title mt-2.5 flex items-center justify-between">
          <span>{t('nav.nodeScope')}</span>
          <button
            type="button"
            onClick={() => onSelectPage('systems')}
            className="text-[10px] text-[var(--cloud-300)] hover:text-[var(--cloud-100)] flex items-center gap-1 normal-case tracking-normal transition-colors cursor-pointer"
            title={t('nav.switchSystem')}
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
            <span>{t('common.actions')}</span>
          </button>
        </div>

        {/* Active Node Card */}
        <div className="px-1 mb-1">
          <button
            type="button"
            onClick={() => onSelectPage('dashboard')}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-all cursor-pointer text-left group"
            title={`${activeSystemName} (${t('nav.dashboard')})`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <StatusDot status={systemStatusToDot(activeSystemStatus)} size={6} />
              <span className="font-mono text-xs font-semibold truncate text-[var(--cloud-100)]">{activeSystemName}</span>
            </span>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border-hairline)] px-1.5 py-0.5 rounded">
              Node
            </span>
          </button>
        </div>

        {/* Node Child Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-nav={item.id}
              onClick={() => onSelectPage(item.id)}
              onMouseEnter={handleMouseEnterButton}
              className={`nav-btn pl-4 ${isActive ? 'active' : ''}`}
            >
              <span className="nav-btn-left">
                <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                <span>{item.label}</span>
              </span>
            </button>
          );
        })}

        {/* Management / Global Section */}
        <div className="nav-section-title mt-2.5">{t('nav.management')}</div>
        <button
          type="button"
          data-nav="settings"
          onClick={() => onSelectPage('settings')}
          onMouseEnter={handleMouseEnterButton}
          className={`nav-btn ${currentPage === 'settings' ? 'active' : ''}`}
        >
          <span className="nav-btn-left">
            <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
            <span>{t('nav.settings')}</span>
          </span>
        </button>
      </nav>

      {/* Footer: Live Status & Version */}
      <div className="sidebar-footer">
        <a
          href="/status"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
          title={t('nav.publicStatusPage')}
        >
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>{t('nav.liveStatus')}</span>
          </span>
          <span className="mono text-[11px] text-[var(--text-muted)]">↗</span>
        </a>

        <a
          href={versionInfo?.releaseUrl || "https://github.com/brhnshn/corvus"}
          target="_blank"
          rel="noopener noreferrer"
          className="version-row hover:bg-[var(--bg-hover)] transition-all cursor-pointer rounded-[var(--radius-sm)] py-1.5 px-2 flex items-center justify-between group no-underline"
          title={t('nav.githubAndChangelog')}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <svg className="w-3.5 h-3.5 fill-current text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span className="mono text-[11px] text-[var(--cloud-200)] group-hover:text-white truncate font-medium">Corvus {versionInfo?.currentVersion ? `v${versionInfo.currentVersion}` : (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__ ? `v${__APP_VERSION__}` : '')}</span>
          </span>
          {versionInfo?.isUpdateAvailable ? (
            <span className="mono text-[10.5px] text-[var(--status-warn)] font-semibold shrink-0">{t('nav.updateAvailable')}</span>
          ) : (
            <span className="mono text-[10.5px] text-[var(--status-up)] flex items-center gap-1 font-medium shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-up)]" />
              {t('nav.upToDate')}
            </span>
          )}
        </a>
      </div>
    </aside>
  );
};
