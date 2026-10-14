import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  meta?: string | number;
}

export interface SegmentedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

/**
 * ObsidianUI gliding pill tabs / segmented control.
 * Smoothly highlights the active item with --cloud-200 background and --bg-canvas text.
 */
export const SegmentedTabs: React.FC<SegmentedTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  size = 'md',
  className = '',
  title,
}) => {
  return (
    <div className={`tabs ${className}`} title={title} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`tab ${isActive ? 'active' : ''} ${
              size === 'sm' ? '!text-[11px] !py-1 !px-2' : ''
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>{tab.label}</span>
              {tab.meta !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isActive
                      ? 'bg-black/15 text-current'
                      : 'bg-white/5 text-[var(--text-muted)]'
                  }`}
                >
                  {tab.meta}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
