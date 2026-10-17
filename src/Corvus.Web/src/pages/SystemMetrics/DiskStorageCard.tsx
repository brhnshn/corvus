import React from 'react';
import { HardDrive } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AnimatedBar } from '../../components/ui/AnimatedBar';

interface DiskStorageCardProps {
  diskUsedGb: number;
  diskTotalGb: number;
}

export const DiskStorageCard: React.FC<DiskStorageCardProps> = ({ diskUsedGb, diskTotalGb }) => {
  const { t } = useI18n();

  const diskFreeGb = Math.max(0, diskTotalGb - diskUsedGb);
  const percentUsed = diskTotalGb > 0 ? Math.round((diskUsedGb / diskTotalGb) * 100) : 0;
  
  const status: 'up' | 'warn' | 'down' = percentUsed >= 90 ? 'down' : percentUsed >= 80 ? 'warn' : 'up';
  const statusLabel = percentUsed >= 90 
    ? t('metrics.critical') 
    : percentUsed >= 80 
    ? t('metrics.warning') 
    : t('metrics.optimal');

  return (
    <Card>
      <CardHeader
        action={
          <StatusBadge status={status}>
            {statusLabel}
          </StatusBadge>
        }
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
            <HardDrive className="w-4 h-4 text-[var(--cloud-200)]" />
          </span>
          <div>
            <CardTitle>{t('metrics.diskChartTitle')}</CardTitle>
            <span className="font-mono text-[11px] text-[var(--text-muted)] block mt-0.5">
              {t('metrics.primaryDisk')}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5">
        {/* Doluluk Bilgisi */}
        <div className="flex items-center justify-between font-mono text-[12px] text-[var(--text-secondary)]">
          <b className="text-[13.5px] font-bold text-[var(--cloud-100)] tabular-nums">
            {t('metrics.percentUsed', { percent: percentUsed })}
          </b>
          <span className="tabular-nums">
            {diskUsedGb} GB / {diskTotalGb} GB
          </span>
        </div>

        {/* Animated Bar */}
        <AnimatedBar
          percentage={percentUsed}
          color={status === 'down' ? 'var(--status-down)' : status === 'warn' ? 'var(--status-warn)' : 'var(--cloud-200)'}
          height={6}
        />

        {/* Kullanılan / Boş / Toplam 3'lü Kutucuklar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">
              {t('metrics.usedDisk')}
            </span>
            <b className="font-mono text-[16px] font-bold text-[var(--cloud-100)] tabular-nums">
              {diskUsedGb} GB
            </b>
          </div>

          <div className="rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">
              {t('metrics.freeDisk')}
            </span>
            <b className="font-mono text-[16px] font-bold text-[var(--status-up)] tabular-nums">
              {diskFreeGb} GB
            </b>
          </div>

          <div className="rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] p-3">
            <span className="text-[11px] text-[var(--text-muted)] block mb-1">
              {t('metrics.totalDisk')}
            </span>
            <b className="font-mono text-[16px] font-bold text-[var(--cloud-100)] tabular-nums">
              {diskTotalGb} GB
            </b>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

