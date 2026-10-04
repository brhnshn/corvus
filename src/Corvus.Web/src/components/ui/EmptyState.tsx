import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`
        surface rounded-[22px] p-8 sm:p-12 flex flex-col items-center justify-center text-center select-none
        ${className}
      `}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.06] flex items-center justify-center text-[#9ba0b5] mb-3.5 [&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#eceef6]">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[#9ba0b5] max-w-sm mt-1 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
