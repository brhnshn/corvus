import React from 'react';
import { getTagStyle } from '../../utils/tagHue';

export interface TagChipProps {
  name: string;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const TagChip: React.FC<TagChipProps> = ({
  name,
  onClick,
  onRemove,
  className = '',
}) => {
  const style = getTagStyle(name);

  return (
    <span
      onClick={onClick}
      style={{
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
      }}
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[9px] border font-mono text-[10.5px] font-medium select-none
        ${onClick ? 'cursor-pointer hover:opacity-85' : ''}
        ${className}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: style.dotColor }} />
      <span>{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-75 cursor-pointer ml-0.5 text-xs font-bold leading-none"
          aria-label={`Etiketi kaldır: ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
};
