import React from 'react';

export interface KpiRowProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const KpiRow: React.FC<KpiRowProps> = ({
  children,
  columns = 4,
  className = '',
}) => {
  const colStyle = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
  };

  return (
    <div className={`kpi-row ${className}`} style={columns !== 4 ? colStyle : undefined}>
      {children}
    </div>
  );
};
