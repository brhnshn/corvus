import React from 'react';
import { HardDrive } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Pill, type StatusType } from '../../components/ui/Pill';
import { ProgressBar } from '../../components/ui/ProgressBar';

interface DiskStorageCardProps {
  diskUsedGb: number;
  diskTotalGb: number;
}

export const DiskStorageCard: React.FC<DiskStorageCardProps> = ({ diskUsedGb, diskTotalGb }) => {
  const { t } = useI18n();

  const diskFreeGb = Math.max(0, diskTotalGb - diskUsedGb);
  const percentUsed = diskTotalGb > 0 ? Math.round((diskUsedGb / diskTotalGb) * 100) : 0;
  
  const status: StatusType = percentUsed >= 90 ? 'err' : percentUsed >= 80 ? 'warn' : 'ok';
  const statusLabel = percentUsed >= 90 
    ? (t('metrics.critical') || 'Kritik') 
    : percentUsed >= 80 
    ? (t('metrics.warning') || 'Yüksek') 
    : (t('metrics.optimal') || 'Normal');

  return (
    <section className="surface rounded-[22px] p-4 sm:p-5 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
          <HardDrive className="w-4 h-4 text-[#eceef6]" />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-[#eceef6] leading-tight">
            {t('metrics.diskChartTitle') || 'Disk Depolama Durumu'}
          </h2>
          <small className="font-mono text-[11px] text-[#9ba0b5]">Birincil Sabit Disk / Bölüm</small>
        </div>
        <div className="ml-auto">
          <Pill status={status} label={statusLabel} showDot={false} />
        </div>
      </div>

      {/* Doluluk Bilgisi */}
      <div className="flex items-center justify-between font-mono text-[11px] text-[#9ba0b5]">
        <b className="text-[13px] font-bold text-[#eceef6]">
          %{percentUsed} Dolu
        </b>
        <span>
          {diskUsedGb} GB / {diskTotalGb} GB
        </span>
      </div>

      {/* Progress Bar */}
      <ProgressBar value={percentUsed} variant={status} />

      {/* Kullanılan / Boş / Toplam 3'lü Kutucuklar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
        <div className="rounded-[16px] bg-white/[0.06] border border-white/10 p-3">
          <small className="text-[11px] text-[#9ba0b5] block mb-1">
            {t('metrics.usedDisk') || 'Kullanılan Alan'}
          </small>
          <b className="font-mono text-[17px] font-bold text-[#eceef6]">
            {diskUsedGb} GB
          </b>
        </div>

        <div className="rounded-[16px] bg-white/[0.06] border border-white/10 p-3">
          <small className="text-[11px] text-[#9ba0b5] block mb-1">
            {t('metrics.freeDisk') || 'Kalan Boş Alan'}
          </small>
          <b className="font-mono text-[17px] font-bold text-[#34d399]">
            {diskFreeGb} GB
          </b>
        </div>

        <div className="rounded-[16px] bg-white/[0.06] border border-white/10 p-3">
          <small className="text-[11px] text-[#9ba0b5] block mb-1">
            {t('metrics.totalDisk') || 'Toplam Kapasite'}
          </small>
          <b className="font-mono text-[17px] font-bold text-[#eceef6]">
            {diskTotalGb} GB
          </b>
        </div>
      </div>
    </section>
  );
};
