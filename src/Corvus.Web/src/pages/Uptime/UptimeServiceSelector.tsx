import React from 'react';
import type { Service } from '../../types';
import { useI18n } from '../../i18n';
import { SearchInput } from '../../components/ui/SearchInput';
import { FilterChip } from '../../components/ui/FilterChip';

interface UptimeServiceSelectorProps {
  services: Service[];
  filteredServices: Service[];
  selectedServiceId?: string;
  search: string;
  statusFilter: 'all' | 'healthy' | 'down';
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (filter: 'all' | 'healthy' | 'down') => void;
  onSelectService: (id: string) => void;
}

export const UptimeServiceSelector: React.FC<UptimeServiceSelectorProps> = ({
  services,
  filteredServices,
  selectedServiceId,
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  onSelectService
}) => {
  const { t } = useI18n();

  return (
    <div className="surface rounded-[22px] p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Arama Kutusu */}
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={t('uptime.searchPlaceholder') || 'İzlenen servislerde ara...'}
          />
        </div>

        {/* Statü Filtreleri */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto no-scrollbar">
          <FilterChip
            selected={statusFilter === 'all'}
            onClick={() => onStatusFilterChange('all')}
            label={t('common.all') || 'Tümü'}
            count={services.length}
          />
          <FilterChip
            selected={statusFilter === 'healthy'}
            onClick={() => onStatusFilterChange('healthy')}
            label="Sağlıklı"
            dotColor="#34d399"
          />
          <FilterChip
            selected={statusFilter === 'down'}
            onClick={() => onStatusFilterChange('down')}
            label="Kesintide"
            dotColor="#f87171"
          />
        </div>
      </div>

      {/* Servis Seçim Hapları */}
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pt-1 no-scrollbar">
        {filteredServices.map((s) => {
          const isSelected = selectedServiceId === s.id;
          const isHealthy = s.status === 'healthy';
          const isDown = s.status === 'down';

          return (
            <button
              key={s.id}
              onClick={() => onSelectService(s.id)}
              className={`px-3 py-1.5 rounded-[12px] text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-white/[0.12] border-white/25 text-[#eceef6] shadow-xs'
                  : 'bg-white/[0.04] border-white/8 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isHealthy ? 'bg-[#34d399]' : isDown ? 'bg-[#f87171] animate-dot-pulse' : 'bg-[#9ba0b5]'
                }`}
              />
              <span className="font-semibold">{s.name}</span>
              {s.port && <span className="font-mono text-[10px] text-[#9ba0b5]">:{s.port}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
