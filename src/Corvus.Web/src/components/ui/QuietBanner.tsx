import React from 'react';

export interface QuietBannerProps {
  summary: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * ObsidianUI natural-language system status banner.
 * Placed at the top of pages to summarize current health in plain words.
 */
export const QuietBanner: React.FC<QuietBannerProps> = ({
  summary,
  actions,
  className = '',
}) => {
  return (
    <div className={`quiet-banner ${className}`}>
      <div className="quiet-summary">{summary}</div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
