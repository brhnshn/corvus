import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-[480px]',
  className = '',
}) => {
  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center select-none">
      {/* Scrim (Karartma & Blur) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Sheet Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`
          relative z-10 w-full ${maxWidth} sheet-glass overflow-hidden
          rounded-t-[28px] lg:rounded-[28px] p-5 lg:p-6
          pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] lg:pb-6
          shadow-[0_20px_60px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.15)]
          transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]
          animate-in fade-in-0 slide-in-from-bottom-6 lg:zoom-in-95
          max-h-[90vh] flex flex-col
          ${className}
        `}
      >
        {/* Mobil Tutamaç Çubuğu */}
        <div className="lg:hidden w-[38px] h-[5px] rounded-full bg-white/20 mx-auto mb-3 shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#eceef6] leading-snug">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[#9ba0b5] mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="overflow-y-auto flex-1 pr-0.5">
          {children}
        </div>
      </div>
    </div>
  );
};
