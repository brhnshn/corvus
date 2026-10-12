import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string; // default: 'max-w-md'
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean; // default: true
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'max-w-md',
  className = '',
  children,
  showCloseButton = true,
}) => {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${maxWidth} rounded-3xl bg-[#1b1d2a] border border-white/10 shadow-2xl p-6 space-y-4 animate-modal-card ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {icon && (
                <div className="shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {title && (
                  typeof title === 'string' ? (
                    <h3 className="text-sm font-semibold text-[#eceef6] truncate">
                      {title}
                    </h3>
                  ) : (
                    title
                  )
                )}
                {subtitle && (
                  typeof subtitle === 'string' ? (
                    <p className="text-xs text-[#9ba0b5] mt-0.5 truncate">
                      {subtitle}
                    </p>
                  ) : (
                    subtitle
                  )
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors cursor-pointer shrink-0"
                aria-label={t('common.close') || 'Kapat'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
