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

/**
 * ObsidianUI Spring + Blur Modal
 * Animates from scale(0.95) translateY(8px) blur(3px) -> scale(1) translateY(0) blur(0px).
 * Closes on backdrop click or ESC key, locks background scroll.
 */
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
        className={`w-full ${maxWidth} rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border-strong)] shadow-2xl p-5 sm:p-6 space-y-4 animate-modal-card ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-hairline)] pb-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0 flex-1">
                {title && (
                  typeof title === 'string' ? (
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {title}
                    </h3>
                  ) : (
                    title
                  )
                )}
                {subtitle && (
                  typeof subtitle === 'string' ? (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
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
                aria-label={t('common.close') || 'Kapat'}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};
