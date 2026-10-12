import React from 'react';
import { Cpu, HardDrive, Boxes, ChevronRight, Terminal } from 'lucide-react';
import type { SystemSummaryDto } from '../../types';
import { formatBytes, getSystemStatusTheme } from '../../utils/systemsUtils';
import { useI18n } from '../../i18n';

interface SystemRowProps {
  system: SystemSummaryDto;
  onSelect: (id: string) => void;
  onOpenTerminal?: (id: string) => void;
}

export const SystemRow: React.FC<SystemRowProps> = ({
  system,
  onSelect,
  onOpenTerminal
}) => {
  const { t } = useI18n();
  const theme = getSystemStatusTheme(system.status);

  const cpuVal = system.currentCpuPercent ?? 0;
  const ramUsed = system.currentRamUsedBytes ?? 0;
  const ramTotal = system.currentRamTotalBytes ?? 1;
  const ramPercent = Math.min(100, Math.round((ramUsed / ramTotal) * 100));

  const diskUsed = system.currentDiskUsedBytes ?? 0;
  const diskTotal = system.currentDiskTotalBytes ?? 1;
  const diskPercent = Math.min(100, Math.round((diskUsed / diskTotal) * 100));

  return (
    <div
      onClick={() => onSelect(system.id)}
      className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-[#1b1d2a]/50 hover:bg-[#1b1d2a] border border-white/5 hover:border-white/10 transition-all cursor-pointer gap-4"
    >
      {/* Sol Blok: Durum, İsim, IP ve Etiketler */}
      <div className="flex items-center gap-3.5 min-w-[240px]">
        <div className="relative">
          <span className={`block w-2.5 h-2.5 rounded-full ${theme.dotColor}`} />
          {system.status === 'online' && (
            <span className={`absolute -inset-0.5 rounded-full ${theme.dotColor} opacity-75 animate-ping`} />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-[#eceef6] group-hover:text-white transition-colors">
              {system.name}
            </h4>
            {system.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-[#9ba0b5]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#9ba0b5] mt-0.5">
            <span>{system.hostname || 'unknown-host'}</span>
            {system.ipAddress && (
              <>
                <span>·</span>
                <span>{system.ipAddress}</span>
              </>
            )}
            {system.osInfo && (
              <>
                <span>·</span>
                <span className="truncate max-w-[120px]">{system.osInfo}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Orta Blok: CPU, RAM, Disk, Konteyner Göstergeleri */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 flex-1 max-w-2xl">
        {/* CPU */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-1">
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>{t('systems.systemRow.cpu')}</span>
            </span>
            <span className="font-mono text-[#eceef6]">%{cpuVal.toFixed(0)}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                cpuVal > 85 ? 'bg-[#f87171]' : cpuVal > 65 ? 'bg-[#fbbf24]' : 'bg-[#34d399]'
              }`}
              style={{ width: `${Math.min(100, cpuVal)}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-1">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>{t('systems.systemRow.ram')}</span>
            </span>
            <span className="font-mono text-[#eceef6] truncate">
              {formatBytes(ramUsed, 0)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ramPercent > 85 ? 'bg-[#f87171]' : ramPercent > 65 ? 'bg-[#fbbf24]' : 'bg-sky-400'
              }`}
              style={{ width: `${ramPercent}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div>
          <div className="flex items-center justify-between text-xs text-[#9ba0b5] mb-1">
            <span className="truncate">
              {t('systems.systemRow.disk')}
            </span>
            <span className="font-mono text-[#eceef6]">%{diskPercent}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                diskPercent > 90 ? 'bg-[#f87171]' : 'bg-indigo-400'
              }`}
              style={{ width: `${diskPercent}%` }}
            />
          </div>
        </div>

        {/* Konteynerler */}
        <div className="hidden sm:flex flex-col justify-center">
          <div className="flex items-center gap-1 text-xs text-[#9ba0b5] mb-1">
            <Boxes className="w-3 h-3" />
            <span>{t('systems.systemRow.containers')}</span>
          </div>
          <div className="font-mono text-xs font-semibold text-[#eceef6]">
            {system.activeContainerCount} Aktif
          </div>
        </div>
      </div>

      {/* Sağ Blok: Aksiyonlar & Ok */}
      <div className="flex items-center gap-2 self-end md:self-center">
        {onOpenTerminal && (
          <button
            onClick={e => {
              e.stopPropagation();
              onOpenTerminal(system.id);
            }}
            title={t('systems.systemRow.terminal')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#9ba0b5] hover:text-[#eceef6] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center gap-1 text-xs font-medium text-[#9ba0b5] group-hover:text-white transition-colors">
          <span className="hidden lg:inline">{t('systems.systemRow.details')}</span>
          <ChevronRight className="w-4 h-4 text-[#9ba0b5] group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
