import React from 'react';
import { Boxes, ChevronRight } from 'lucide-react';
import type { SystemSummaryDto } from '../../types';
import { formatBytes, getSystemStatusTheme } from '../../utils/systemsUtils';
import { SystemActionMenu } from './SystemActionMenu';
import type { SystemColumnKey } from './SystemsColumnsMenu';
import { useI18n } from '../../i18n';

interface SystemsTableRowProps {
  system: SystemSummaryDto;
  onSelectSystem: (id: string) => void;
  visibleColumns: Record<SystemColumnKey, boolean>;
  onEditSystem?: (system: SystemSummaryDto) => void;
  onTogglePauseSystem?: (system: SystemSummaryDto) => void;
  onDeleteSystem?: (system: SystemSummaryDto) => void;
}

interface UsageMeterProps {
  value: React.ReactNode;
  barPercent: number;
  background: string;
  detail?: string;
}

// Yüzde değeri + ilerleme çubuğu (+ opsiyonel kullanılan miktar) hücre içeriği
const UsageMeter: React.FC<UsageMeterProps> = ({ value, barPercent, background, detail }) => (
  <div className="flex items-center gap-2.5 font-mono text-xs tabular-nums">
    <b className="min-w-[40px] font-semibold text-[var(--text-primary)]">
      {value}
    </b>
    <span className="w-20 h-1.5 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded overflow-hidden">
      <i
        className="block h-full rounded transition-all duration-300"
        style={{
          width: `${Math.max(barPercent, 2)}%`,
          background,
        }}
      />
    </span>
    {detail !== undefined && (
      <em className="not-italic text-[var(--text-muted)] text-[11px]">
        {detail}
      </em>
    )}
  </div>
);

const renderDash = () => <span className="text-[var(--text-muted)] font-mono text-[13px]">–</span>;

export const SystemsTableRow: React.FC<SystemsTableRowProps> = ({
  system,
  onSelectSystem,
  visibleColumns,
  onEditSystem,
  onTogglePauseSystem,
  onDeleteSystem,
}) => {
  const { t } = useI18n();

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
      onClick={() => onSelectSystem(system.id)}
      className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group"
    >
      {/* 1. Sistem Adı, Durum & Host Etiketi */}
      {visibleColumns.system && (
        <td className="py-4 px-4 font-semibold text-sm whitespace-nowrap">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dotColor}`} />
            <span className="text-[var(--text-primary)] group-hover:text-[var(--cloud-100)] transition-colors">
              {system.name}
            </span>

            {system.id === 'local-host' && (
              <span className="font-mono text-[10px] font-semibold text-[var(--cloud-200)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded px-1.5 py-0.5">
                {t('systems.table.host')}
              </span>
            )}

            {system.tags.map((tTag, idx) => (
              <span
                key={idx}
                className="font-mono text-[10px] font-normal text-[var(--text-secondary)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded px-1.5 py-0.5"
              >
                {tTag}
              </span>
            ))}
          </div>
        </td>
      )}

      {/* 2. İşlemci (CPU) */}
      {visibleColumns.cpu && (
        <td className="py-4 px-4 whitespace-nowrap">
          {isPending ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--status-warn-bg)] border border-[var(--status-warn)]/30 text-[var(--status-warn)]">
              {t('systems.table.pendingAgent')}
            </span>
          ) : isPaused ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-muted)]">
              {t('systems.table.paused')}
            </span>
          ) : (
            <UsageMeter
              value={<>%{cpuVal.toFixed(1)}</>}
              barPercent={cpuVal}
              background={cpuVal > 85 ? 'var(--status-down)' : cpuVal > 65 ? 'var(--status-warn)' : 'var(--status-up)'}
            />
          )}
        </td>
      )}

      {/* 3. Bellek (RAM) */}
      {visibleColumns.ram && (
        <td className="py-4 px-4 whitespace-nowrap">
          {isPending || isPaused ? (
            renderDash()
          ) : (
            <UsageMeter
              value={<>%{ramPercent}</>}
              barPercent={ramPercent}
              background={ramPercent > 85 ? 'var(--status-down)' : ramPercent > 65 ? 'var(--status-warn)' : 'var(--cloud-300)'}
              detail={formatBytes(ramUsed, 0)}
            />
          )}
        </td>
      )}

      {/* 4. Depolama alanı (Disk) */}
      {visibleColumns.disk && (
        <td className="py-4 px-4 whitespace-nowrap">
          {isPending || isPaused ? (
            renderDash()
          ) : (
            <UsageMeter
              value={<>%{diskPercent}</>}
              barPercent={diskPercent}
              background={diskPercent > 85 ? 'var(--status-down)' : diskPercent > 70 ? 'var(--status-warn)' : 'var(--cloud-400)'}
              detail={formatBytes(diskUsed, 0)}
            />
          )}
        </td>
      )}

      {/* 5. GPU (Opsiyonel) */}
      {visibleColumns.gpu && (
        <td className="py-4 px-4 whitespace-nowrap">
          {renderDash()}
        </td>
      )}

      {/* 6. Yük Ortalaması */}
      {visibleColumns.load && (
        <td className="py-4 px-4 whitespace-nowrap">
          {!isPending && !isPaused && system.loadAvg1m != null ? (
            <span className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
              <span className="text-[var(--status-up)] mr-1.5">●</span>
              {system.loadAvg1m.toFixed(2)} {system.loadAvg5m != null ? system.loadAvg5m.toFixed(2) : '-'} {system.loadAvg15m != null ? system.loadAvg15m.toFixed(2) : '-'}
            </span>
          ) : (
            renderDash()
          )}
        </td>
      )}

      {/* 7. Ağ Hızı */}
      {visibleColumns.net && (
        <td className="py-4 px-4 whitespace-nowrap">
          {!isPending && !isPaused && system.netRxBytesSec != null ? (
            <span className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
              {formatBytes(system.netRxBytesSec)}/s
            </span>
          ) : (
            renderDash()
          )}
        </td>
      )}

      {/* 8. Sıcaklık / 9. Pil / 10. Wi-Fi (Opsiyonel) */}
      {visibleColumns.temp && <td className="py-4 px-4 whitespace-nowrap">{renderDash()}</td>}
      {visibleColumns.bat && <td className="py-4 px-4 whitespace-nowrap">{renderDash()}</td>}
      {visibleColumns.wifi && <td className="py-4 px-4 whitespace-nowrap">{renderDash()}</td>}

      {/* 11. Hizmetler / Konteyner */}
      {visibleColumns.svc && (
        <td className="py-4 px-4 whitespace-nowrap">
          {isPending || isPaused ? (
            renderDash()
          ) : (
            <span className="inline-flex gap-1.5 items-center border border-[var(--border-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-mono font-medium bg-[var(--bg-subtle)] text-[var(--text-primary)]">
              <Boxes className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>{system.activeContainerCount} {t('systems.table.active')}</span>
            </span>
          )}
        </td>
      )}

      {/* 12. Güncellemeler (Opsiyonel) */}
      {visibleColumns.upd && <td className="py-4 px-4 whitespace-nowrap">{renderDash()}</td>}

      {/* 13. Aksiyon Menüsü & Detay Oku */}
      <td className="py-4 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-2 text-[var(--text-secondary)]">
          {onEditSystem && onTogglePauseSystem && onDeleteSystem && (
            <SystemActionMenu
              system={system}
              onEdit={onEditSystem}
              onTogglePause={onTogglePauseSystem}
              onDelete={onDeleteSystem}
            />
          )}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:text-[var(--cloud-100)] transition-transform" />
        </div>
      </td>
    </tr>
  );
};
