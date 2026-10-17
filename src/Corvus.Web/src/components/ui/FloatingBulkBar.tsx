import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useI18n } from '../../i18n';

export interface FloatingBulkBarProps {
  selectedCount: number;
  onClear: () => void;
  children?: React.ReactNode;
  className?: string;
  countLabel?: string;
}

/**
 * ObsidianUI Floating Bulk Action Bar that slides up from screen bottom
 * with translateY(80px) scale(0.95) -> translateY(0) scale(1) spring physics.
 */
export const FloatingBulkBar: React.FC<FloatingBulkBarProps> = ({
  selectedCount,
  onClear,
  children,
  className = '',
  countLabel,
}) => {
  const { t } = useI18n();
  const effectiveCountLabel = countLabel ?? t('common.selected');
  const isVisible = selectedCount > 0;

  return (
    <div
      className={`bulk-bar ${isVisible ? 'visible' : ''} ${className}`}
      role="toolbar"
      aria-hidden={!isVisible}
    >
      <div className="flex items-center gap-2 pr-2 border-r border-[var(--border-hairline)] text-xs font-mono">
        <span className="font-semibold text-[var(--cloud-200)]">{selectedCount}</span>
        <span className="text-[var(--text-muted)]">{effectiveCountLabel}</span>
      </div>

      <div className="flex items-center gap-1.5">{children}</div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="!text-[var(--text-muted)] hover:!text-[var(--text-primary)]"
        title={t('common.clearSelection')}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
