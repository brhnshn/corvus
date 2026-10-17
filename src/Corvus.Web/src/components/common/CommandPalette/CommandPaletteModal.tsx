import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CommandPaletteInput } from './CommandPaletteInput';
import { CommandPaletteResults } from './CommandPaletteResults';
import type { CommandItem } from './types';
import { fuzzyMatch } from '../../../utils/fuzzySearch';
import { useI18n } from '../../../i18n';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);

  // Modal kapandığında aramayı sıfırla
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Arama filtreleme
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    const isCommandPrefix = q.startsWith('>');
    const normalizedQuery = isCommandPrefix ? q.slice(1).trim() : q;

    return items
      .map((item) => {
        const titleLower = item.title.toLowerCase();
        const textToMatch = `${item.title} ${item.subtitle || ''} ${item.category}`.toLowerCase();
        
        let boost = 0;
        // Exact prefix match gets a large boost
        if (titleLower.startsWith(q) || (isCommandPrefix && titleLower.startsWith(`> ${normalizedQuery}`))) {
          boost += 100;
        } else if (titleLower.includes(normalizedQuery)) {
          boost += 50;
        }

        if (isCommandPrefix && item.category === 'commands') {
          boost += 60;
        }

        const res = fuzzyMatch(normalizedQuery || q, textToMatch);
        return { item, match: res.match || boost > 0, score: res.score + boost };
      })
      .filter((res) => res.match)
      .sort((a, b) => b.score - a.score)
      .map((res) => res.item);
  }, [items, query]);

  // Arama değiştikçe seçili index'i sınırla
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Klavye yönlendirmesi
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('commandPalette.modalAriaLabel')}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-[#1b1d2a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-modal-card"
      >
        <CommandPaletteInput
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          placeholder={t('commandPalette.searchPlaceholder')}
        />

        <CommandPaletteResults
          items={filteredItems}
          selectedIndex={selectedIndex}
          onSelect={(item) => {
            item.onSelect();
            onClose();
          }}
          onMouseEnterItem={(idx) => setSelectedIndex(idx)}
        />

        <div className="px-4 py-2 border-t border-white/10 bg-[#0d0e15]/40 flex items-center justify-between text-[11px] text-[#9ba0b5]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[9px] mr-1">↑↓</kbd> {t('commandPalette.navigate')}
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[9px] mr-1">↵</kbd> {t('commandPalette.select')}
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-white/10 border border-white/10 font-mono text-[9px] mr-1">esc</kbd> {t('commandPalette.close')}
            </span>
          </div>
          <span className="font-mono text-[10px]">Corvus v1.6.0</span>
        </div>
      </div>
    </div>
  );
};
