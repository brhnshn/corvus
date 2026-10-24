import React from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../i18n';
import type { SystemStatus } from '../types/systems';
import { useSidebarResize } from './sidebar/useSidebarResize';
import { SidebarNav } from './sidebar/SidebarNav';
import { SidebarFooter } from './sidebar/SidebarFooter';

export type PageId = 'dashboard' | 'services' | 'containers' | 'deployments' | 'systems' | 'metrics' | 'uptime' | 'activity' | 'settings' | 'profile';

export interface SidebarProps {
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
  const { t } = useI18n();
  const {
    sidebarWidth,
    isResizing,
    handleMouseDown,
    handleDoubleClickResizer,
  } = useSidebarResize();

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

      <SidebarNav
        currentPage={currentPage}
        onSelectPage={onSelectPage}
        sidebarWidth={sidebarWidth}
        activeSystemName={activeSystemName}
        activeSystemStatus={activeSystemStatus}
      />

      <SidebarFooter />
    </aside>
  );
};
