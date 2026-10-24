import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useI18n } from '../../../i18n';

export interface IncidentsToolbarProps {
  subFilter: 'all' | 'active' | 'resolved';
  onSubFilterChange: (filter: 'all' | 'active' | 'resolved') => void;
  totalCount: number;
  activeCount: number;
  resolvedCount: number;
  loading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
}

export const IncidentsToolbar: React.FC<IncidentsToolbarProps> = ({
  subFilter,
  onSubFilterChange,
  totalCount,
  activeCount,
  resolvedCount,
  loading,
  onRefresh,
  onCreate,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl surface border border-white/10">
      <div className="flex items-center gap-2">
        {/* Sub filter buttons */}
        <button
          onClick={() => onSubFilterChange('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            subFilter === 'all'
              ? 'bg-white text-black shadow-sm'
              : 'text-[#9ba0b5] hover:text-[#eceef6] bg-white/[0.04] border border-white/10'
          }`}
        >
          {t('common.all')} ({totalCount})
        </button>
        <button
          onClick={() => onSubFilterChange('active')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            subFilter === 'active'
              ? 'bg-white text-black shadow-sm'
              : 'text-[#9ba0b5] hover:text-[#eceef6] bg-white/[0.04] border border-white/10'
          }`}
        >
          {t('incidents.activeTab')} ({activeCount})
        </button>
        <button
          onClick={() => onSubFilterChange('resolved')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            subFilter === 'resolved'
              ? 'bg-white text-black shadow-sm'
              : 'text-[#9ba0b5] hover:text-[#eceef6] bg-white/[0.04] border border-white/10'
          }`}
        >
          {t('incidents.resolvedTab')} ({resolvedCount})
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
          title={t('common.refresh')}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#d5d5dc]' : ''}`} />
        </button>

        <button
          onClick={onCreate}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-black hover:bg-[#eceef6] rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t('incidents.newIncident')}
        </button>
      </div>
    </div>
  );
};
