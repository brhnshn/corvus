import React from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface AlertStripProps {
  type?: 'warn' | 'danger';
  message: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

/**
 * ObsidianUI low-key warning/danger alert strip.
 * Appears only when user intervention is required, avoiding aggressive neon glows.
 */
export const AlertStrip: React.FC<AlertStripProps> = ({
  type = 'warn',
  message,
  icon,
  action,
  onClose,
  className = '',
}) => {
  const isDanger = type === 'danger';
  const DefaultIcon = isDanger ? AlertCircle : AlertTriangle;

  return (
    <div
      className={`alert-strip ${
        isDanger
          ? '!bg-[var(--status-down-bg)] !border-[rgba(229,83,75,0.25)] text-[#f08a85]'
          : ''
      } ${className}`}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="shrink-0 text-current">
          {icon || <DefaultIcon className="w-4 h-4" />}
        </span>
        <div className="truncate text-xs sm:text-sm">{message}</div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
