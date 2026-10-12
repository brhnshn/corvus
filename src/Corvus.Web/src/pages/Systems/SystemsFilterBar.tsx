import React from 'react';
import { Search } from 'lucide-react';
import { useI18n } from '../../i18n';

interface SystemsFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  sortBy: string;
  onSortByChange: (s: string) => void;
}

export const SystemsFilterBar: React.FC<SystemsFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange
}) => {
  const { t } = useI18n();

  const statuses = [
    { id: 'all', label: t('systems.filters.allStatuses') },
    { id: 'online', label: t('systems.filters.online') },
    { id: 'degraded', label: t('systems.filters.degraded') },
    { id: 'offline', label: t('systems.filters.offline') }
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 text-[#9ba0b5] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('systems.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-[#eceef6] placeholder:text-[#9ba0b5] focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Status Chips & Sorting */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5">
          {statuses.map(st => (
            <button
              key={st.id}
              onClick={() => onStatusFilterChange(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st.id
                  ? 'bg-white/10 text-[#eceef6] shadow-sm'
                  : 'text-[#9ba0b5] hover:text-[#eceef6]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={e => onSortByChange(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-[#eceef6] focus:outline-none"
        >
          <option value="name" className="bg-[#1b1d2a]">{t('systems.filters.sortName')}</option>
          <option value="cpu" className="bg-[#1b1d2a]">{t('systems.filters.sortCpu')}</option>
          <option value="ram" className="bg-[#1b1d2a]">{t('systems.filters.sortRam')}</option>
          <option value="lastSeen" className="bg-[#1b1d2a]">{t('systems.filters.sortLastSeen')}</option>
        </select>
      </div>
    </div>
  );
};
