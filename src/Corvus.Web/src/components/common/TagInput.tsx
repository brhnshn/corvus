import React, { useState, useRef } from 'react';
import { Tag, Plus } from 'lucide-react';
import { TagBadge } from './TagBadge';
import { useI18n } from '../../i18n';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: string[];
  disabled?: boolean;
}

const DEFAULT_SUGGESTIONS = ['Prod', 'Staging', 'Dev', 'Database', 'Internal', 'API'];

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder,
  maxTags = 10,
  suggestions = DEFAULT_SUGGESTIONS,
  disabled = false,
}) => {
  const { t } = useI18n();
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed || tags.length >= maxTags) return;

    // Duplicate case-insensitive check
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }

    onChange([...tags, trimmed]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase()));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  };

  // Filter available suggestions (exclude already selected)
  const availableSuggestions = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Tag container & input box */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/20 transition-all min-h-[42px] cursor-text ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <Tag className="w-4 h-4 text-white/40 ml-1 shrink-0" />

        {tags.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            onRemove={disabled ? undefined : () => removeTag(tag)}
            size="sm"
          />
        ))}

        {tags.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) addTag(inputValue);
            }}
            placeholder={tags.length === 0 ? (placeholder || t('services.tagPlaceholder') || 'Etiket ekle (Prod, DB, API)...') : ''}
            disabled={disabled}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder-white/30 focus:outline-none py-0.5 px-1 font-mono"
          />
        )}
      </div>

      {/* Quick suggestions */}
      {!disabled && availableSuggestions.length > 0 && tags.length < maxTags && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/60 pt-0.5">
          <span className="text-[11px] text-white/40 flex items-center gap-1">
            <Plus className="w-3 h-3" />
            {t('services.quickTags') || 'Önerilenler'}:
          </span>
          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => addTag(suggestion)}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-white/70 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              +{suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
