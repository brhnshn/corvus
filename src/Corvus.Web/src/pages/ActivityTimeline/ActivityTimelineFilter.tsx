import React from 'react';
import { Search, Server, Globe } from 'lucide-react';
import { useI18n } from '../../i18n';

interface ActivityTimelineFilterProps {
  category: string;
  onCategoryChange: (cat: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  scope: 'node' | 'all';
  onScopeChange: (scope: 'node' | 'all') => void;
  activeSystemName: string;
}

export const ActivityTimelineFilter: React.FC<ActivityTimelineFilterProps> = ({
  category,
  onCategoryChange,
  search,
  onSearchChange,
  scope,
  onScopeChange,
  activeSystemName,
}) => {
  const { t } = useI18n();

  const categories = [
    { id: 'all', label: t('activity.categories.all') || 'Tüm Olaylar' },
    { id: 'container', label: t('activity.categories.container') || 'Konteyner' },
    { id: 'service', label: t('activity.categories.service') || 'Servis' },
    { id: 'alert', label: t('activity.categories.alert') || 'Alarmlar' },
    { id: 'security', label: t('activity.categories.security') || 'Güvenlik & Giriş' },
    { id: 'system', label: t('activity.categories.system') || 'Sistem' },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-card)] border border-[var(--border-hairline)]">
      {/* Node / Fleet Scope Filter */}
      <div className="flex items-center gap-1.5 p-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] shrink-0 self-start md:self-auto">
        <button
          type="button"
          onClick={() => onScopeChange('node')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
            scope === 'node'
              ? 'bg-[var(--bg-card)] text-[var(--cloud-100)] shadow-sm border border-[var(--border-hairline)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
          title={`${activeSystemName} (${t('activity.thisNode') || 'Bu Düğüm'})`}
        >
          <Server className="w-3 h-3 text-[var(--cloud-300)]" />
          <span className="truncate max-w-[120px]">{activeSystemName}</span>
        </button>
        <button
          type="button"
          onClick={() => onScopeChange('all')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
            scope === 'all'
              ? 'bg-[var(--bg-card)] text-[var(--cloud-100)] shadow-sm border border-[var(--border-hairline)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <Globe className="w-3 h-3 text-[var(--cloud-300)]" />
          <span>{t('activity.allFleet') || 'Tüm Filo'}</span>
        </button>
      </div>

      {/* Categories Tabs */}
      <div className="tabs overflow-x-auto no-scrollbar flex-1 min-w-0">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={`tab ${category === cat.id ? 'active' : ''}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative min-w-[210px] shrink-0">
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('activity.searchPlaceholder') || 'Olay veya kaynak ara...'}
          className="input pl-8 w-full text-xs"
        />
      </div>
    </div>
  );
};
