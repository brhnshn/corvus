import React from 'react';
import { RefreshCw, Search } from 'lucide-react';
import type { SystemSummaryDto } from '../../types';
import { useI18n } from '../../i18n';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { Button } from '../../components/ui/Button';
import type { SystemdUnitFilter } from './systemdUnits.utils';

interface SystemdUnitsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  systems: SystemSummaryDto[];
  activeSystemId: string;
  onSystemChange: (systemId: string) => void;
  filter: SystemdUnitFilter;
  onFilterChange: (filter: SystemdUnitFilter) => void;
  totalCount: number;
  activeCount: number;
  failedCount: number;
  inactiveCount: number;
  refreshing: boolean;
  onRefresh: () => void;
}

export const SystemdUnitsToolbar: React.FC<SystemdUnitsToolbarProps> = ({
  search,
  onSearchChange,
  systems,
  activeSystemId,
  onSystemChange,
  filter,
  onFilterChange,
  totalCount,
  activeCount,
  failedCount,
  inactiveCount,
  refreshing,
  onRefresh
}) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--bg-card)] border border-[var(--border-hairline)] rounded-lg p-3">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('services.systemdSearchPlaceholder')}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cloud-300)]"
          />
        </div>
        {systems.length > 0 && (
          <select
            value={activeSystemId}
            onChange={(e) => onSystemChange(e.target.value)}
            aria-label={t('services.systemdTitle')}
            className="text-xs bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded px-2.5 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--cloud-300)]"
          >
            <option value="local">{t('services.systemdLocalHost')}</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.ipAddress || s.hostname || s.id.substring(0, 8)})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SegmentedTabs
          size="sm"
          tabs={[
            { id: 'all', label: t('services.systemdFilterAll'), meta: totalCount },
            { id: 'active', label: t('services.systemdFilterActive'), meta: activeCount },
            { id: 'failed', label: t('services.systemdFilterFailed'), meta: failedCount },
            { id: 'inactive', label: t('services.systemdFilterInactive'), meta: inactiveCount },
          ]}
          activeTab={filter}
          onChange={(id) => onFilterChange(id as SystemdUnitFilter)}
        />

        <Button
          variant="default"
          size="sm"
          onClick={onRefresh}
          isLoading={refreshing}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
        />
      </div>
    </div>
  );
};
