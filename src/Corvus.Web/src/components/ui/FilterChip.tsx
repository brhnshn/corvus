import React from 'react';

export interface FilterChipProps {
  label: string;
  count?: number;
  selected?: boolean;
  dotColor?: string;
  onClick: () => void;
  className?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  count,
  selected = false,
  dotColor,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        shrink-0 h-[30px] px-3 rounded-full border text-xs font-medium inline-flex items-center gap-2 select-none cursor-pointer transition-[transform,background-color,border-color,color] duration-200 active:scale-[0.93]
        ${
          selected
            ? 'bg-[#d5d5dc] text-[#1b1d2a] border-transparent font-semibold shadow-xs'
            : 'bg-white/[0.06] text-[#eceef6] border-white/10 hover:bg-white/[0.12] hover:border-white/15'
        }
        ${className}
      `}
    >
      {dotColor && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[11px] not-italic ${
            selected ? 'text-[#1b1d2a]/80 font-bold' : 'text-[#9ba0b5]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
