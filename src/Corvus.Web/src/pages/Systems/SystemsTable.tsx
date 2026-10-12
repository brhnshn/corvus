import React from 'react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Database, 
  Activity, 
  Network, 
  Boxes, 
  Thermometer, 
  Battery, 
  Wifi, 
  ArrowUpCircle, 
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import type { SystemSummaryDto } from '../../types';
import { formatBytes, getSystemStatusTheme } from '../../utils/systemsUtils';
import { SystemActionMenu } from './SystemActionMenu';
import type { SystemColumnKey } from './SystemsColumnsMenu';
import { useI18n } from '../../i18n';

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
  const { t } = useI18n();

  const renderSortArrow = (columnKey: string) => {
    if (sortBy === columnKey) {
      return sortDirection === 'desc' ? (
        <ArrowDown className="w-3.5 h-3.5 text-[#7c7cff] stroke-[2.5]" />
      ) : (
        <ArrowUp className="w-3.5 h-3.5 text-[#7c7cff] stroke-[2.5]" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-80 transition-opacity" />;
  };

  const renderDash = () => <span className="text-[#8b90a7] font-mono text-[13px]">–</span>;

  return (
    <div className="border border-[#242637] rounded-xl bg-[#0d0e17] overflow-hidden shadow-2xl">
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#3a3d57] scrollbar-track-[#0d0e17]">
        <table className="w-full border-collapse min-w-[1400px] text-left">
          <thead>
            <tr className="bg-[#0f101b] border-b border-[#242637] select-none text-[#8b90a7] font-semibold text-sm">
              {/* 1. Sistem */}
              {visibleColumns.system && (
                <th
                  onClick={() => onSortByChange('name')}
                  className="py-4 px-5 cursor-pointer hover:text-[#eceef5] transition-colors group whitespace-nowrap"
                >
                  <div className="inline-flex items-center gap-2">
                    <Server className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.system')}</span>
                    {renderSortArrow('name')}
                  </div>
                </th>
              )}

              {/* 2. İşlemci */}
              {visibleColumns.cpu && (
                <th
                  onClick={() => onSortByChange('cpu')}
                  className="py-4 px-5 cursor-pointer hover:text-[#eceef5] transition-colors group whitespace-nowrap"
                >
                  <div className="inline-flex items-center gap-2">
                    <Cpu className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.cpu')}</span>
                    {renderSortArrow('cpu')}
                  </div>
                </th>
              )}

              {/* 3. Bellek */}
              {visibleColumns.ram && (
                <th
                  onClick={() => onSortByChange('ram')}
                  className="py-4 px-5 cursor-pointer hover:text-[#eceef5] transition-colors group whitespace-nowrap"
                >
                  <div className="inline-flex items-center gap-2">
                    <HardDrive className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.ram')}</span>
                    {renderSortArrow('ram')}
                  </div>
                </th>
              )}

              {/* 4. Depolama alanı */}
              {visibleColumns.disk && (
                <th
                  onClick={() => onSortByChange('disk')}
                  className="py-4 px-5 cursor-pointer hover:text-[#eceef5] transition-colors group whitespace-nowrap"
                >
                  <div className="inline-flex items-center gap-2">
                    <Database className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.disk')}</span>
                    {renderSortArrow('disk')}
                  </div>
                </th>
              )}

              {/* 5. GPU (Opsiyonel) */}
              {visibleColumns.gpu && (
                <th className="py-4 px-5 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Cpu className="w-4 h-4 stroke-[1.8] text-[#7c7cff] shrink-0" />
                    <span>{t('systems.columns.gpu')}</span>
                  </div>
                </th>
              )}

              {/* 6. Yük Ort. */}
              {visibleColumns.load && (
                <th
                  onClick={() => onSortByChange('load')}
                  className="py-4 px-5 cursor-pointer hover:text-[#eceef5] transition-colors group whitespace-nowrap"
                >
                  <div className="inline-flex items-center gap-2">
                    <Activity className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.load')}</span>
                    {renderSortArrow('load')}
                  </div>
                </th>
              )}

              {/* 7. Ağ */}
              {visibleColumns.net && (
                <th className="py-4 px-5 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Network className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.net')}</span>
                  </div>
                </th>
              )}

              {/* 8. Sıcaklık (Opsiyonel) */}
              {visibleColumns.temp && (
                <th className="py-4 px-5 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Thermometer className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.temp')}</span>
                  </div>
                </th>
              )}

              {/* 9. Pil (Opsiyonel) */}
              {visibleColumns.bat && (
                <th className="py-4 px-5 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Battery className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.bat')}</span>
                  </div>
                </th>
              )}

              {/* 10. Wi-Fi (Opsiyonel) */}
              {visibleColumns.wifi && (
                <th className="py-4 px-5 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Wifi className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.wifi')}</span>
                  </div>
                </th>
              )}

              {/* 11. Hizmetler / Konteyner */}
              {visibleColumns.svc && (
                <th className="py-4 px-5 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Boxes className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.svc')}</span>
                  </div>
                </th>
              )}

              {/* 12. Güncellemeler (Opsiyonel) */}
              {visibleColumns.upd && (
                <th className="py-4 px-5 whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 stroke-[1.8] shrink-0" />
                    <span>{t('systems.columns.upd')}</span>
                  </div>
                </th>
              )}

              {/* 13. İşlemler & Detay */}
              <th className="py-4 px-5 text-right whitespace-nowrap">
                <span className="sr-only">{t('common.details')}</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#242637]">
            {systems.map((system) => {
              const theme = getSystemStatusTheme(system.status);
              const isPending = system.status === 'pending';
              const isPaused = system.status === 'paused';

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
                  className="hover:bg-[#141626] transition-colors cursor-pointer group"
                >
                  {/* 1. Sistem Adı, Durum & Host Etiketi */}
                  {visibleColumns.system && (
                    <td className="py-5 px-5 font-semibold text-[15px] whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dotColor}`} />
                        <span className="text-[#eceef5] group-hover:text-white transition-colors">
                          {system.name}
                        </span>

                        {system.id === 'local-host' && (
                          <span className="font-mono text-[11px] font-medium text-[#7c7cff] bg-[#1a1b30] border border-[#2a2c4d] rounded-md px-2 py-0.5">
                            {t('systems.table.host')}
                          </span>
                        )}

                        {system.tags.map((tTag, idx) => (
                          <span
                            key={idx}
                            className="font-mono text-[11px] font-normal text-[#8b90a7] bg-[#1b1d2c] rounded-md px-2 py-0.5"
                          >
                            {tTag}
                          </span>
                        ))}
                      </div>
                    </td>
                  )}

                  {/* 2. İşlemci (CPU) */}
                  {visibleColumns.cpu && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {isPending ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          {t('systems.table.pendingAgent')}
                        </span>
                      ) : isPaused ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white/10 border border-white/15 text-[#8b90a7]">
                          {t('systems.table.paused')}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2.5 font-mono text-[13px]">
                          <b className="min-w-[44px] font-semibold text-[#eceef5]">
                            %{cpuVal.toFixed(1)}
                          </b>
                          <span className="w-20 h-2 bg-[#1f2133] rounded overflow-hidden">
                            <i
                              className="block h-full rounded transition-all duration-300"
                              style={{
                                width: `${Math.max(cpuVal, 2)}%`,
                                background: cpuVal > 85 ? '#f87171' : cpuVal > 65 ? '#f0b429' : '#2fd08f',
                              }}
                            />
                          </span>
                        </div>
                      )}
                    </td>
                  )}

                  {/* 3. Bellek (RAM) */}
                  {visibleColumns.ram && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {isPending || isPaused ? (
                        renderDash()
                      ) : (
                        <div className="flex items-center gap-2.5 font-mono text-[13px]">
                          <b className="min-w-[44px] font-semibold text-[#eceef5]">
                            %{ramPercent}
                          </b>
                          <span className="w-20 h-2 bg-[#1f2133] rounded overflow-hidden">
                            <i
                              className="block h-full rounded transition-all duration-300"
                              style={{
                                width: `${Math.max(ramPercent, 2)}%`,
                                background: ramPercent > 85 ? '#f87171' : ramPercent > 65 ? '#f0b429' : '#1fb6ff',
                              }}
                            />
                          </span>
                          <em className="not-italic text-[#8b90a7] text-xs">
                            {formatBytes(ramUsed, 0)}
                          </em>
                        </div>
                      )}
                    </td>
                  )}

                  {/* 4. Depolama alanı (Disk) */}
                  {visibleColumns.disk && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {isPending || isPaused ? (
                        renderDash()
                      ) : (
                        <div className="flex items-center gap-2.5 font-mono text-[13px]">
                          <b className="min-w-[44px] font-semibold text-[#eceef5]">
                            %{diskPercent}
                          </b>
                          <span className="w-20 h-2 bg-[#1f2133] rounded overflow-hidden">
                            <i
                              className="block h-full rounded transition-all duration-300"
                              style={{
                                width: `${Math.max(diskPercent, 2)}%`,
                                background: diskPercent > 85 ? '#f87171' : diskPercent > 70 ? '#f0b429' : '#1fb6ff',
                              }}
                            />
                          </span>
                          <em className="not-italic text-[#8b90a7] text-xs">
                            {formatBytes(diskUsed, 0)}
                          </em>
                        </div>
                      )}
                    </td>
                  )}

                  {/* 5. GPU (Opsiyonel) */}
                  {visibleColumns.gpu && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {renderDash()}
                    </td>
                  )}

                  {/* 6. Yük Ortalaması */}
                  {visibleColumns.load && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {!isPending && !isPaused && system.loadAvg1m != null ? (
                        <span className="font-mono text-[13px] text-[#eceef5]">
                          <span className="text-[#2fd08f] mr-1.5">●</span>
                          {system.loadAvg1m.toFixed(2)} {system.loadAvg5m != null ? system.loadAvg5m.toFixed(2) : '0.00'} {system.loadAvg15m != null ? system.loadAvg15m.toFixed(2) : '0.00'}
                        </span>
                      ) : (
                        renderDash()
                      )}
                    </td>
                  )}

                  {/* 7. Ağ Hızı */}
                  {visibleColumns.net && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {!isPending && !isPaused && system.netRxBytesSec != null ? (
                        <span className="font-mono text-[13px] text-[#eceef5]">
                          {formatBytes(system.netRxBytesSec)}/s
                        </span>
                      ) : (
                        renderDash()
                      )}
                    </td>
                  )}

                  {/* 8. Sıcaklık (Opsiyonel) */}
                  {visibleColumns.temp && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {renderDash()}
                    </td>
                  )}

                  {/* 9. Pil (Opsiyonel) */}
                  {visibleColumns.bat && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {renderDash()}
                    </td>
                  )}

                  {/* 10. Wi-Fi (Opsiyonel) */}
                  {visibleColumns.wifi && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {renderDash()}
                    </td>
                  )}

                  {/* 11. Hizmetler / Konteyner */}
                  {visibleColumns.svc && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {isPending || isPaused ? (
                        renderDash()
                      ) : (
                        <span className="inline-flex gap-1.5 items-center border border-[#242637] rounded-lg px-3 py-1 text-[13px] font-medium bg-[#161827] text-[#eceef5]">
                          <Boxes className="w-3.5 h-3.5 text-[#8b90a7]" />
                          <span>{system.activeContainerCount} {t('systems.table.active')}</span>
                        </span>
                      )}
                    </td>
                  )}

                  {/* 12. Güncellemeler (Opsiyonel) */}
                  {visibleColumns.upd && (
                    <td className="py-5 px-5 whitespace-nowrap">
                      {renderDash()}
                    </td>
                  )}

                  {/* 13. Aksiyon Menüsü & Detay Oku */}
                  <td className="py-5 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 text-[#8b90a7]">
                      {onEditSystem && onTogglePauseSystem && onDeleteSystem && (
                        <SystemActionMenu
                          system={system}
                          onEdit={onEditSystem}
                          onTogglePause={onTogglePauseSystem}
                          onDelete={onDeleteSystem}
                        />
                      )}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 group-hover:text-white transition-transform" />
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
