import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badge,
  actions,
  className = '',
}) => {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-3 sm:gap-4 mb-3.5 sm:mb-4 animate-rv ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.5px] text-[#eceef6] leading-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-[13px] text-[#9ba0b5] mt-1 leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </header>
  );
};
