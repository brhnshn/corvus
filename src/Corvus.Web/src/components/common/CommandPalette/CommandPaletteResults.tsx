import React from 'react';
import type { CommandItem } from './types';
import { useI18n } from '../../../i18n';

interface CommandPaletteResultsProps {
  items: CommandItem[];
  selectedIndex: number;
  onSelect: (item: CommandItem) => void;
  onMouseEnterItem: (index: number) => void;
}

export const CommandPaletteResults: React.FC<CommandPaletteResultsProps> = ({
  items,
  selectedIndex,
  onSelect,
  onMouseEnterItem,
}) => {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-[#9ba0b5]">
        {t('common.unknown') || 'Sonuç bulunamadı'}
      </div>
    );
  }

  // Gruplara ayır
  const grouped: Record<string, CommandItem[]> = {};
  items.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  const categoryTitles: Record<string, string> = {
    pages: t('nav.dashboard') ? 'Sayfalar' : 'Pages',
    actions: t('common.actions') ? 'Aksiyonlar' : 'Actions',
    containers: t('nav.containers') ? 'Konteynerler' : 'Containers',
    services: t('nav.services') ? 'Servisler' : 'Services',
  };

  let globalIndex = 0;

  return (
    <div className="max-h-80 overflow-y-auto p-2 space-y-3">
      {Object.entries(grouped).map(([category, catItems]) => (
        <div key={category} className="space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-mono font-semibold tracking-wider text-[#9ba0b5] uppercase">
            {categoryTitles[category] || category}
          </div>
          {catItems.map((item) => {
            const currentIndex = globalIndex++;
            const isSelected = currentIndex === selectedIndex;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                onMouseEnter={() => onMouseEnterItem(currentIndex)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-white/10 text-white shadow-xs'
                    : 'text-[#eceef6] hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white/[0.06] text-[#9ba0b5]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-medium truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-[10px] text-[#9ba0b5] truncate">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>

                {item.shortcut && (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono rounded-md bg-white/10 border border-white/15 text-[#9ba0b5]">
                    {item.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
};
