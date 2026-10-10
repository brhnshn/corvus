import React from 'react';
import { Search } from 'lucide-react';

interface ActivityTimelineFilterProps {
  category: string;
  onCategoryChange: (cat: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export const ActivityTimelineFilter: React.FC<ActivityTimelineFilterProps> = ({
  category,
  onCategoryChange,
  search,
  onSearchChange,
}) => {
  const categories = [
    { id: 'all', label: 'Tüm Olaylar' },
    { id: 'container', label: 'Konteyner' },
    { id: 'service', label: 'Servis' },
    { id: 'alert', label: 'Alarmlar' },
    { id: 'security', label: 'Güvenlik & Giriş' },
    { id: 'system', label: 'Sistem' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#1b1d2a]/50 border border-white/10">
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategoryChange(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              category === cat.id
                ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs'
                : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.04]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="relative min-w-[200px]">
        <Search className="w-3.5 h-3.5 text-[#9ba0b5] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Olay veya kaynak ara..."
          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#eceef6] placeholder-[#9ba0b5] focus:outline-hidden focus:border-white/30"
        />
      </div>
    </div>
  );
};
