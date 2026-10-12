import React from 'react';
import { Server, Activity, Cpu, HardDrive, Boxes } from 'lucide-react';
import type { SystemSummaryDto } from '../../types';
import { formatBytes } from '../../utils/systemsUtils';
import { useI18n } from '../../i18n';

interface SystemsKpisProps {
  systems: SystemSummaryDto[];
}

export const SystemsKpis: React.FC<SystemsKpisProps> = ({ systems }) => {
  const { t } = useI18n();

  const totalSystems = systems.length;
  const onlineSystems = systems.filter(s => s.status === 'online').length;

  let totalCpu = 0;
  let cpuCount = 0;
  let totalRamUsed = 0;
  let totalRamCapacity = 0;
  let totalContainers = 0;

  for (const s of systems) {
    if (s.currentCpuPercent !== undefined && s.currentCpuPercent !== null) {
      totalCpu += s.currentCpuPercent;
      cpuCount++;
    }
    if (s.currentRamUsedBytes) totalRamUsed += s.currentRamUsedBytes;
    if (s.currentRamTotalBytes) totalRamCapacity += s.currentRamTotalBytes;
    totalContainers += s.activeContainerCount || 0;
  }

  const avgCpu = cpuCount > 0 ? (totalCpu / cpuCount).toFixed(1) : '0.0';

  const cards = [
    {
      title: t('systems.kpis.totalSystems'),
      value: totalSystems.toString(),
      subValue: `${onlineSystems}/${totalSystems} ${t('systems.kpis.onlineSystems')}`,
      icon: Server,
      color: 'text-[#d5d5dc]'
    },
    {
      title: t('systems.kpis.onlineSystems'),
      value: onlineSystems.toString(),
      subValue: onlineSystems === totalSystems ? 'Tümü Aktif' : `${totalSystems - onlineSystems} Kesinti`,
      icon: Activity,
      color: 'text-[#34d399]'
    },
    {
      title: t('systems.kpis.avgCpu'),
      value: `%${avgCpu}`,
      subValue: `${cpuCount} Düğüm Ortalaması`,
      icon: Cpu,
      color: 'text-indigo-400'
    },
    {
      title: t('systems.kpis.totalRam'),
      value: formatBytes(totalRamUsed),
      subValue: `/ ${formatBytes(totalRamCapacity)} Kapasite`,
      icon: HardDrive,
      color: 'text-sky-400'
    },
    {
      title: t('systems.kpis.totalContainers'),
      value: totalContainers.toString(),
      subValue: 'Uç Düğümlerde Çalışıyor',
      icon: Boxes,
      color: 'text-amber-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#1b1d2a]/60 border border-white/5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#9ba0b5]">{card.title}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-[#eceef6]">
                {card.value}
              </div>
              <div className="text-[11px] text-[#9ba0b5] truncate mt-0.5">
                {card.subValue}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
