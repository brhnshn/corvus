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
} from 'lucide-react';
import { StatusDot } from './ui/StatusDot';
import { api, type VersionInfo } from '../api/client';
import { useI18n } from '../i18n';

export type PageId = 'dashboard' | 'services' | 'containers' | 'systems' | 'metrics' | 'uptime' | 'activity' | 'settings' | 'profile';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isCollapsed?: boolean;
  onOpenCommandPalette?: () => void;
  activeSystemName?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onSelectPage,
  isCollapsed = false,
  onOpenCommandPalette,
  activeSystemName = 'homelab-01',
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
    { id: 'dashboard', label: t('nav.dashboard') || 'Kontrol Paneli', icon: LayoutDashboard },
    { id: 'services', label: t('nav.services') || 'Servisler', icon: Grid },
    { id: 'containers', label: t('nav.containers') || 'Konteynerler', icon: Boxes },
    { id: 'metrics', label: t('nav.metrics') || 'Sistem Metrikleri', icon: Activity },
    { id: 'uptime', label: t('nav.uptime') || 'Uptime', icon: Clock },
    { id: 'activity', label: 'Olay Geçmişi', icon: History },
    { id: 'settings', label: t('nav.settings') || 'Ayarlar', icon: Settings },
  ] as const;

  return (
    <aside
      className={`sidebar ${isCollapsed ? '-translate-x-full lg:translate-x-0' : ''}`}
      style={{ width: `${sidebarWidth}px` }}
      aria-label="Sol Menü"
    >
      {/* Sidebar Draggable Resizer */}
      <div
        className={`sidebar-resizer ${isResizing ? 'active' : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClickResizer}
        title="Kenar çubuğunu sürükle (Çift tıkla: Sıfırla)"
      />

      {/* Top: Brand, System Selector, Command Search */}
      <div className="sidebar-top">
        <div className="brand-row">
          <div className="brand">
            <span className="brand-mark">C</span>
            <span>CORVUS</span>
          </div>
          <span className="mono text-[11px] text-[var(--text-muted)]">AOT</span>
        </div>

        {/* System Selector Switcher */}
        <button
          type="button"
          className="system-selector"
          onClick={() => onSelectPage('systems')}
          title="Sistem Değiştir / Tüm Sistemler"
        >
          <span className="flex items-center gap-1.5 truncate">
            <StatusDot status="up" size={6} />
            <span className="mono font-semibold truncate">{activeSystemName}</span>
          </span>
          <span className="text-[11px] text-[var(--text-muted)] shrink-0">← Tüm Sistemler</span>
        </button>

        {/* Command Palette Trigger */}
        {onOpenCommandPalette && (
          <button
            type="button"
            className="cmd-trigger"
            onClick={onOpenCommandPalette}
            title="Komut Paletini Aç (Ctrl K)"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" />
              <span>{t('common.search') || 'Komutlar...'}</span>
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

        <div className="nav-section-title">Navigasyon</div>

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
              className={`nav-btn ${isActive ? 'active' : ''}`}
            >
              <span className="nav-btn-left">
                <Icon />
                <span>{item.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer: Live Status & Version / Memory footprint */}
      <div className="sidebar-footer">
        <a
          href="/status"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
          title="Herkese Açık Canlı Durum Sayfası"
        >
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>{t('nav.liveStatus') || 'Canlı Durum Sayfası'}</span>
          </span>
          <span className="mono text-[11px] text-[var(--text-muted)]">↗</span>
        </a>

        <div className="version-row">
          <span>Corvus {versionInfo ? `v${versionInfo.currentVersion}` : 'v1.6.0'}</span>
          <span className="mono text-[var(--cloud-300)]">21.8 MB RAM</span>
        </div>
      </div>
    </aside>
  );
};
