import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  showCloseButton?: boolean;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'w-[min(100%,460px)]',
  className = '',
  showCloseButton = false,
}) => {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  // Açılma ve yumuşak kapanma animasyonu yönetimi (Orijinal HTML transition: transform .5s cubic-bezier(.22,1,.36,1))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let rAf1: number;
    let rAf2: number;

    if (isOpen) {
      setMounted(true);
      rAf1 = requestAnimationFrame(() => {
        rAf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      document.body.style.overflow = 'hidden';
    } else {
      setVisible(false);
      timer = setTimeout(() => {
        setMounted(false);
      }, 500);
      document.body.style.overflow = '';
    }

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rAf1);
      cancelAnimationFrame(rAf2);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC tuşu ile kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 select-none pointer-events-none">
      {/* Scrim (Arka plan karartma & blur) - Orijinal: transition: opacity .3s */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity duration-300 ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sheet Container: Ekranın tam alt ortasından (translate(-50%, 105%) -> (0)) kayarak açılır */}
      <section
        role="dialog"
        aria-modal="true"
        style={{
          transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 105%)',
          transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`
          fixed left-1/2 bottom-0 z-50 pointer-events-auto
          ${maxWidth} sheet-glass overflow-hidden
          rounded-t-[28px] px-3.5 pt-2.5 pb-[calc(18px+env(safe-area-inset-bottom,0px))]
          border-t border-x border-white/10
          shadow-[0_-12px_40px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.14)]
          max-h-[90vh] flex flex-col
          ${className}
        `}
      >
        {/* Tutamaç Çubuğu (hn: width: 38px; height: 5px; border-radius: 3px; background: rgba(255,255,255,.1); margin: 0 auto 12px) */}
        <div className="w-[38px] h-[5px] rounded-[3px] bg-white/15 mx-auto mb-3 shrink-0" />

        {/* Başlık Alanı */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-2 px-1.5 pb-2 shrink-0">
            <div className="min-w-0 flex-1">
              {typeof title === 'string' ? (
                <h3 className="text-[16px] font-semibold text-[#eceef6] leading-tight">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <div className="text-[11px] text-[#9ba0b5] font-normal mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* İçerik */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </section>
    </div>
  );
};
