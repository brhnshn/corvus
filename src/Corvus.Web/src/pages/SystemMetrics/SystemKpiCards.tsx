import React from 'react';
import type { SystemMetric } from '../../api/client';
import { useI18n } from '../../i18n';
import { KpiRow } from '../../components/ui/KpiRow';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusDot } from '../../components/ui/StatusDot';

interface SystemKpiCardsProps {
  metrics: SystemMetric[];
  latestMetric?: SystemMetric | null;
}

export const SystemKpiCards: React.FC<SystemKpiCardsProps> = ({ metrics, latestMetric }) => {
  const { t } = useI18n();

  const current = latestMetric || (metrics.length > 0 ? metrics[metrics.length - 1] : null);

  if (!current) return null;

  // CPU istatistikleri
  const cpuValues = metrics.map((m) => m.cpuPercent);
  const minCpu = cpuValues.length > 0 ? Math.min(...cpuValues) : current.cpuPercent;
  const maxCpu = cpuValues.length > 0 ? Math.max(...cpuValues) : current.cpuPercent;
  const avgCpu = cpuValues.length > 0 
    ? Math.round(cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) 
    : current.cpuPercent;

  // RAM istatistikleri
  const ramUsedGb = +(current.ramUsedMb / 1024).toFixed(1);
  const ramTotalGb = +(current.ramTotalMb / 1024).toFixed(1);
  const ramPercent = current.ramTotalMb > 0 
    ? Math.round((current.ramUsedMb / current.ramTotalMb) * 100) 
    : 0;
  const ramFreeGb = +(ramTotalGb - ramUsedGb).toFixed(1);

  // Disk istatistikleri
  const diskPercent = current.diskTotalGb > 0 
    ? Math.round((current.diskUsedGb / current.diskTotalGb) * 100) 
    : 0;
  const diskFreeGb = Math.max(0, current.diskTotalGb - current.diskUsedGb);

  const getStatus = (percent: number, warn = 70, crit = 90): 'up' | 'warn' | 'down' => {
    if (percent >= crit) return 'down';
    if (percent >= warn) return 'warn';
    return 'up';
  };

  const cpuStatus = getStatus(current.cpuPercent, 70, 90);
  const ramStatus = getStatus(ramPercent, 80, 90);
  const diskStatus = getStatus(diskPercent, 80, 90);

  return (
    <KpiRow className="mb-4">
      <KpiCard
        label={t('metrics.cpuUsage')}
        meta={<StatusDot status={cpuStatus} />}
        value={current.cpuPercent}
        prefix="%"
        decimals={1}
        barPercentage={current.cpuPercent}
        barColor={cpuStatus === 'down' ? 'var(--status-down)' : cpuStatus === 'warn' ? 'var(--status-warn)' : 'var(--cloud-200)'}
        subtext={`${t('metrics.avgUsage', { value: avgCpu })} · ${t('metrics.minUsage', { value: minCpu.toFixed(1) })} · ${t('metrics.maxUsage', { value: maxCpu.toFixed(1) })}`}
      />

      <KpiCard
        label={t('metrics.ramUsage')}
        meta={<StatusDot status={ramStatus} />}
        value={ramUsedGb}
        decimals={1}
        suffix={` / ${ramTotalGb} GB`}
        barPercentage={ramPercent}
        barColor={ramStatus === 'down' ? 'var(--status-down)' : ramStatus === 'warn' ? 'var(--status-warn)' : 'var(--cloud-200)'}
        subtext={t('metrics.freeSpaceSubtext', { free: ramFreeGb, percent: 100 - ramPercent })}
      />

      <KpiCard
        label={t('metrics.diskChartTitle')}
        meta={<StatusDot status={diskStatus} />}
        value={current.diskUsedGb}
        decimals={0}
        suffix={` / ${current.diskTotalGb} GB`}
        barPercentage={diskPercent}
        barColor={diskStatus === 'down' ? 'var(--status-down)' : diskStatus === 'warn' ? 'var(--status-warn)' : 'var(--cloud-200)'}
        subtext={t('metrics.freeSpaceSubtext', { free: diskFreeGb, percent: 100 - diskPercent })}
      />
    </KpiRow>
  );
};

