import React from 'react';
import { Search } from 'lucide-react';
import type { Service } from '../../types';
import { useI18n } from '../../i18n';

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
    <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-2xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Arama Kutusu */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            placeholder={t('uptime.searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#e5e7eb] placeholder:text-[#9ca3af]/60 focus:outline-none focus:border-[#d4d4d8] transition-colors"
          />
        </div>

        {/* Statü Filtreleri */}
        <div className="flex items-center gap-1 self-start sm:self-auto text-xs">
          <button
            onClick={() => onStatusFilterChange('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#0f1117] text-[#e5e7eb] border border-[#2a2e3f]'
                : 'text-[#9ca3af] hover:text-[#e5e7eb]'
            }`}
          >
            {t('common.all')} ({services.length})
          </button>
          <button
            onClick={() => onStatusFilterChange('healthy')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'healthy'
                ? 'bg-[#0f1117] text-emerald-400 border border-[#2a2e3f]'
                : 'text-[#9ca3af] hover:text-[#e5e7eb]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Sağlıklı</span>
          </button>
          <button
            onClick={() => onStatusFilterChange('down')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'down'
                ? 'bg-[#0f1117] text-rose-400 border border-[#2a2e3f]'
                : 'text-[#9ca3af] hover:text-[#e5e7eb]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Kesintide</span>
          </button>
        </div>
      </div>

      {/* Servis Kartları / Butonları */}
      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pt-1">
        {filteredServices.map((s) => {
          const isSelected = selectedServiceId === s.id;
          const isHealthy = s.status === 'healthy';
          const isDown = s.status === 'down';

          return (
            <button
              key={s.id}
              onClick={() => onSelectService(s.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-[#0f1117] border-[#d4d4d8] text-white shadow-sm'
                  : 'bg-[#0f1117]/60 border-[#2a2e3f] text-[#9ca3af] hover:text-[#e5e7eb] hover:border-[#3f4458]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isHealthy ? 'bg-emerald-500' : isDown ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="truncate max-w-[140px] sm:max-w-[180px]">{s.name}</span>
              {s.checkType === 'tcp' && (
                <span className="text-[9px] px-1 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  TCP
                </span>
              )}
              {s.checkType === 'ping' && (
                <span className="text-[9px] px-1 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                  PING
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
