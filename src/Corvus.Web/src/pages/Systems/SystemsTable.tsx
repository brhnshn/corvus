import React from 'react';
import { ArrowUpDown, ChevronRight, Boxes } from 'lucide-react';
import type { SystemSummaryDto } from '../../types';
import { formatBytes, getSystemStatusTheme } from '../../utils/systemsUtils';
import { useI18n } from '../../i18n';

interface SystemsTableProps {
  systems: SystemSummaryDto[];
  onSelectSystem: (id: string) => void;
  sortBy?: string;
  onSortByChange: (s: string) => void;
}

export const SystemsTable: React.FC<SystemsTableProps> = ({
  systems,
  onSelectSystem,
  sortBy: _sortBy,
  onSortByChange
}) => {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161824]/60 overflow-hidden shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-[#9ba0b5] select-none font-medium">
              <th
                onClick={() => onSortByChange('name')}
                className="py-3 px-4 cursor-pointer hover:text-[#eceef6] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('systems.table.system')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => onSortByChange('cpu')}
                className="py-3 px-4 cursor-pointer hover:text-[#eceef6] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('systems.table.cpu')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => onSortByChange('ram')}
                className="py-3 px-4 cursor-pointer hover:text-[#eceef6] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('systems.table.ram')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5">
                  <span>{t('systems.table.disk')}</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th className="py-3 px-4">
                <span>{t('systems.table.loadAvg')}</span>
              </th>

              <th className="py-3 px-4">
                <span>{t('systems.table.network')}</span>
              </th>

              <th className="py-3 px-4 text-center">
                <span>{t('systems.table.containers')}</span>
              </th>

              <th className="py-3 px-4 text-right">
                <span className="sr-only">{t('common.details')}</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {systems.map((system) => {
              const theme = getSystemStatusTheme(system.status);
              const cpuVal = typeof system.currentCpuPercent === 'number' ? system.currentCpuPercent : 0;

              const ramUsed = system.currentRamUsedBytes ?? 0;
              const ramTotal = system.currentRamTotalBytes ?? 1;
              const ramPercent = ramTotal > 0 ? Math.min(100, Math.round((ramUsed / ramTotal) * 100)) : 0;

              const diskUsed = system.currentDiskUsedBytes ?? 0;
              const diskTotal = system.currentDiskTotalBytes ?? 1;
              const diskPercent = diskTotal > 0 ? Math.min(100, Math.round((diskUsed / diskTotal) * 100)) : 0;

              return (
                <tr
                  key={system.id}
                  onClick={() => onSelectSystem(system.id)}
                  className="group hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  {/* 1. Sistem Adı, Durum & Host Etiketi */}
                  <td className="py-3.5 px-4 font-medium">
                    <div className="flex items-center gap-2.5">
                      <span className={`block w-2 h-2 rounded-full ${theme.dotColor} shrink-0`} />

                      <div className="flex items-center gap-2">
                        <span className="text-[#eceef6] group-hover:text-white font-semibold">
                          {system.name}
                        </span>

                        {system.id === 'local-host' && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-400/25 text-[10px] font-mono font-medium text-indigo-300">
                            {t('systems.table.host')}
                          </span>
                        )}

                        {system.tags.map((tTag, idx) => (
                          <span
                            key={idx}
                            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-[#9ba0b5] font-mono"
                          >
                            {tTag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* 2. İşlemci (Yüzde + İlerleme Çubuğu) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <span className="font-mono text-[#eceef6] w-12 text-right">
                        %{cpuVal.toFixed(1)}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            cpuVal > 85 ? 'bg-red-400' : cpuVal > 65 ? 'bg-amber-400' : 'bg-[#34d399]'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, cpuVal))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* 3. Bellek (RAM) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="font-mono text-[#eceef6] w-12 text-right">
                        %{ramPercent}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            ramPercent > 85 ? 'bg-red-400' : ramPercent > 65 ? 'bg-amber-400' : 'bg-sky-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, ramPercent))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#9ba0b5] font-mono hidden md:inline-block">
                        {formatBytes(ramUsed, 0)}
                      </span>
                    </div>
                  </td>

                  {/* 4. Depolama Alanı (Disk) */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="font-mono text-[#eceef6] w-12 text-right">
                        %{diskPercent}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden max-w-[80px]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            diskPercent > 90 ? 'bg-red-400' : diskPercent > 75 ? 'bg-amber-400' : 'bg-amber-400/80'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(4, diskPercent))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#9ba0b5] font-mono hidden md:inline-block">
                        {formatBytes(diskUsed, 0)}
                      </span>
                    </div>
                  </td>

                  {/* 5. Yük Ortalaması (Gerçek Veri) */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#eceef6]">
                    {system.loadAvg1m != null ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>
                          {system.loadAvg1m.toFixed(2)} {system.loadAvg5m != null ? system.loadAvg5m.toFixed(2) : '0.00'} {system.loadAvg15m != null ? system.loadAvg15m.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#9ba0b5]">-</span>
                    )}
                  </td>

                  {/* 6. Ağ Hızı (Gerçek Veri) */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#9ba0b5]">
                    {system.netRxBytesSec != null ? (
                      <span>{formatBytes(system.netRxBytesSec)}/s</span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>

                  {/* 7. Hizmetler / Konteyner Sayısı */}
                  <td className="py-3.5 px-4 text-center font-mono">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[11px] text-[#eceef6]">
                      <Boxes className="w-3 h-3 text-[#9ba0b5]" />
                      <span>{system.activeContainerCount} {t('systems.table.active')}</span>
                    </span>
                  </td>

                  {/* 8. Detaya Git Oku */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end text-[#9ba0b5] group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
