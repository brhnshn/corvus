import React from 'react';
import { X } from 'lucide-react';
import { getTagColor } from '../../utils/tagColor';

interface TagBadgeProps {
  tag: string;
  count?: number;
  onRemove?: () => void;
  onClick?: () => void;
  isActive?: boolean;
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  count,
  onRemove,
  onClick,
  isActive = false,
  size = 'sm',
  showDot = true,
  className = '',
}) => {
  const color = getTagColor(tag);
  const isClickable = Boolean(onClick);

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5 gap-1.5' 
    : 'text-xs px-2.5 py-1 gap-2';

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={`inline-flex items-center font-mono font-medium rounded-full border transition-all select-none ${sizeClasses} ${
        isActive
          ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm shadow-indigo-500/20'
          : `${color.bg} ${color.border} ${color.text} hover:opacity-90`
      } ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${className}`}
    >
      {showDot && (
        <span 
          className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : color.dot}`} 
          aria-hidden="true" 
        />
      )}
      <span>{tag}</span>

      {typeof count === 'number' && (
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded-full ${
            isActive ? 'bg-white/20 text-white' : 'bg-black/30 text-current'
          }`}
        >
          {count}
        </span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-0.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          title={`Kaldır: ${tag}`}
          aria-label={`Kaldır: ${tag}`}
        >
          <X className="w-3 h-3 text-current" />
        </button>
      )}
    </span>
  );
};
