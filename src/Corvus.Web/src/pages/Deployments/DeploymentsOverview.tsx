import React from 'react';
import { useI18n } from '../../i18n';
import { KpiRow } from '../../components/ui/KpiRow';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusDot } from '../../components/ui/StatusDot';

export interface DeploymentsOverviewProps {
  stats: {
    total: number;
    successRate: number;
    active: number;
    avgDurationMs: number;
  };
  statusFilter?: 'all' | 'success' | 'failed' | 'pending';
  onFilterStatus?: (filter: 'all' | 'success' | 'failed' | 'pending') => void;
}

export const DeploymentsOverview: React.FC<DeploymentsOverviewProps> = ({
  stats,
  statusFilter = 'all',
  onFilterStatus,
}) => {
  const { t } = useI18n();

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '-';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    const secs = (ms / 1000).toFixed(1);
    return `${secs} s`;
  };

  return (
    <KpiRow className="mb-4">
      {/* Toplam Dağıtım */}
      <KpiCard
        label={t('deployments.statTotalDeployments')}
        value={stats.total}
        decimals={0}
        subtext={t('deployments.deploymentsProgressSubtext', { completed: stats.total - stats.active, active: stats.active })}
        onClick={() => onFilterStatus?.('all')}
        className={statusFilter === 'all' ? 'border-[var(--cloud-400)]' : ''}
      />

      {/* Başarı Oranı */}
      <KpiCard
        label={t('deployments.statSuccessRate')}
        meta={
          <StatusDot
            status={
              stats.total > 0 && stats.successRate >= 80
                ? 'up'
                : stats.total > 0
                ? 'warn'
                : 'muted'
            }
          />
        }
        value={stats.total > 0 ? `%${stats.successRate.toFixed(1)}` : '-'}
        subtext={t('deployments.stableDeployments')}
        onClick={() => onFilterStatus?.('success')}
        className={statusFilter === 'success' ? 'border-[var(--status-up)]' : ''}
      />

      {/* Aktif Dağıtımlar */}
      <KpiCard
        label={t('deployments.statActiveDeployments')}
        meta={<StatusDot status={stats.active > 0 ? 'warn' : 'muted'} />}
        value={stats.active}
        decimals={0}
        subtext={stats.active > 0 ? t('deployments.processing') : t('deployments.noPendingTasks')}
        onClick={() => onFilterStatus?.('pending')}
        className={statusFilter === 'pending' ? 'border-[var(--status-warn)]' : ''}
      />

      {/* Ortalama Süre */}
      <KpiCard
        label={t('deployments.statAvgDuration')}
        value={formatDuration(stats.avgDurationMs)}
        subtext={t('deployments.completionSpeed')}
      />
    </KpiRow>
  );
};
