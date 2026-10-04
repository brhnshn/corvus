import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Ara...',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-[#9ba0b5] pointer-events-none shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-[38px] pl-10 pr-9 rounded-full border border-white/10 bg-white/[0.07] text-[#eceef6] placeholder-[#9ba0b5] text-[13px] outline-none transition-[border-color,background-color] focus:border-[#d5d5dc] focus:bg-white/[0.10]"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 p-1 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 cursor-pointer"
          aria-label="Aramayı temizle"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
