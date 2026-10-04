import React from 'react';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface SegmentProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'default' | 'sm';
}

export function Segment<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
  size = 'default',
}: SegmentProps<T>) {
  const heightClass = size === 'sm' ? 'h-7 text-xs px-2.5' : 'h-8 text-xs px-3.5';

  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-full border border-white/10 bg-white/[0.06] gap-1 select-none overflow-x-auto scrollbar-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isSelected}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`
              flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap cursor-pointer transition-[background-color,color,transform] duration-200 active:scale-[0.93] outline-none
              ${heightClass}
              ${
                isSelected
                  ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs'
                  : 'text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.06]'
              }
            `}
          >
            {opt.icon && <span className="[&>svg]:w-3.5 [&>svg]:h-3.5 shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
