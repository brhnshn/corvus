import React from 'react';

export interface ExpandableRowProps {
  isExpanded: boolean;
  colSpan: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Table drawer accordion row that expands/collapses smoothly via
 * CSS grid-template-rows: 0fr -> 1fr with ObsidianUI spring physics.
 */
export const ExpandableRow: React.FC<ExpandableRowProps> = ({
  isExpanded,
  colSpan,
  children,
  className = '',
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="expand-cell">
        <div className={`expand-wrapper ${isExpanded ? 'open' : ''} ${className}`}>
          <div className="expand-inner">{children}</div>
        </div>
      </td>
    </tr>
  );
};

export interface TableWrapProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableWrap: React.FC<TableWrapProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`table-wrap ${className}`} {...props}>
      <table className="table">{children}</table>
    </div>
  );
};
