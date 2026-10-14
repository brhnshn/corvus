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
    <div className="filter-bar">
      <div className="tabs">
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

      <div className="relative min-w-[210px]">
        <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Olay veya kaynak ara..."
          className="input pl-8 w-full text-xs"
        />
      </div>
    </div>
  );
};

