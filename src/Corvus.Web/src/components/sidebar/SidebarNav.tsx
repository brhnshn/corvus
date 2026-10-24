import React from 'react';
import {
  LayoutDashboard,
  Grid,
  Boxes,
  Activity,
  Clock,
  Settings,
  History,
  Server,
  ArrowLeftRight,
  Rocket,
} from 'lucide-react';
import { StatusDot } from '../ui/StatusDot';
import { useI18n } from '../../i18n';
import { systemStatusToDot } from '../../hooks/useActiveSystemStatus';
import type { SystemStatus } from '../../types/systems';
import type { PageId } from '../Sidebar';
import { useNavPills } from './useNavPills';

export interface SidebarNavProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  sidebarWidth: number;
  activeSystemName?: string | null;
  activeSystemStatus?: SystemStatus | null;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentPage,
  onSelectPage,
  sidebarWidth,
  activeSystemName = 'Host',
  activeSystemStatus = null,
}) => {
  const { t } = useI18n();

  const {
    navRef,
    hoverPill,
    activePill,
    handleMouseEnterButton,
    handleMouseLeaveNav,
  } = useNavPills(currentPage, sidebarWidth);

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
  );
};
