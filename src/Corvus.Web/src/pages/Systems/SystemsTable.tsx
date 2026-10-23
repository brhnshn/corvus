import React from 'react';
import type { SystemSummaryDto } from '../../types';
import type { SystemColumnKey } from './SystemsColumnsMenu';
import { SystemsTableHeader } from './SystemsTableHeader';
import { SystemsTableRow } from './SystemsTableRow';

interface SystemsTableProps {
  systems: SystemSummaryDto[];
  onSelectSystem: (id: string) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortByChange: (s: string) => void;
  visibleColumns: Record<SystemColumnKey, boolean>;
  onEditSystem?: (system: SystemSummaryDto) => void;
  onTogglePauseSystem?: (system: SystemSummaryDto) => void;
  onDeleteSystem?: (system: SystemSummaryDto) => void;
}

export const SystemsTable: React.FC<SystemsTableProps> = ({
  systems,
  onSelectSystem,
  sortBy,
  sortDirection = 'asc',
  onSortByChange,
  visibleColumns,
  onEditSystem,
  onTogglePauseSystem,
  onDeleteSystem,
}) => {
  return (
    <div className="border border-[var(--border-hairline)] rounded-[var(--radius-md)] bg-[var(--bg-canvas)] overflow-hidden shadow-2xl">
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse min-w-[1400px] text-left">
          <SystemsTableHeader
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortByChange={onSortByChange}
            visibleColumns={visibleColumns}
          />

          <tbody className="divide-y divide-[var(--border-hairline)]">
            {systems.map((system) => (
              <SystemsTableRow
                key={system.id}
                system={system}
                onSelectSystem={onSelectSystem}
                visibleColumns={visibleColumns}
                onEditSystem={onEditSystem}
                onTogglePauseSystem={onTogglePauseSystem}
                onDeleteSystem={onDeleteSystem}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
