import React from 'react';
import { Search, X } from 'lucide-react';

interface CommandPaletteInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
}

export const CommandPaletteInput: React.FC<CommandPaletteInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder,
}) => {
  return (
    <div className="relative flex items-center px-4 py-3 border-b border-white/10">
      <Search className="w-4 h-4 text-[#9ba0b5] shrink-0 mr-3" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full bg-transparent text-[#eceef6] placeholder-[#9ba0b5] text-sm focus:outline-hidden"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-md text-[#9ba0b5] hover:text-white hover:bg-white/10 transition-colors"
          title="Temizle"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
