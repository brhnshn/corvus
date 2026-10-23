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
  ArrowUp,
  ArrowDown,
  ArrowUpDown
} from 'lucide-react';
import type { SystemColumnKey } from './SystemsColumnsMenu';
import { useI18n } from '../../i18n';

interface SystemsTableHeaderProps {
  sortBy?: string;
  sortDirection: 'asc' | 'desc';
  onSortByChange: (s: string) => void;
  visibleColumns: Record<SystemColumnKey, boolean>;
}

export const SystemsTableHeader: React.FC<SystemsTableHeaderProps> = ({
  sortBy,
  sortDirection,
  onSortByChange,
  visibleColumns,
}) => {
  const { t } = useI18n();

  const renderSortArrow = (columnKey: string) => {
    if (sortBy === columnKey) {
      return sortDirection === 'desc' ? (
        <ArrowDown className="w-3.5 h-3.5 text-[var(--cloud-200)] stroke-[2.5]" />
      ) : (
        <ArrowUp className="w-3.5 h-3.5 text-[var(--cloud-200)] stroke-[2.5]" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 opacity-40 group-hover:opacity-80 transition-opacity" />;
  };

  return (
    <thead>
      <tr className="bg-[var(--bg-shell)] border-b border-[var(--border-hairline)] select-none text-[var(--text-secondary)] font-semibold text-xs">
        {/* 1. Sistem */}
        {visibleColumns.system && (
          <th
            onClick={() => onSortByChange('name')}
            className="py-3 px-4 cursor-pointer hover:text-[var(--text-primary)] transition-colors group whitespace-nowrap"
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
  );
};
