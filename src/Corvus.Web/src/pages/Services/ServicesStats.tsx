import React from 'react';
import { Server, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { StatTile } from '../../components/ui/StatTile';
import type { Service } from '../../types';

export interface ServicesStatsProps {
  services: Service[];
  onFilterStatus?: (status: string | null) => void;
  selectedStatus?: string | null;
}

export const ServicesStats: React.FC<ServicesStatsProps> = ({
  services,
  onFilterStatus,
  selectedStatus,
}) => {
  const total = services.length;
  const healthy = services.filter((s) => s.status === 'healthy').length;
  const degraded = services.filter((s) => s.status === 'degraded').length;
  const down = services.filter((s) => s.status === 'down').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-3.5 animate-rv">
      <StatTile
        label="Toplam Servis"
        value={total}
        unit="tanımlı"
        icon={<Server className="w-4 h-4" />}
        onClick={() => onFilterStatus?.(null)}
        className={selectedStatus === null ? 'border-white/30' : ''}
      />

      <StatTile
        label="Sağlıklı"
        value={healthy}
        unit="çalışıyor"
        icon={<CheckCircle2 className="w-4 h-4 text-[#34d399]" />}
        progress={total > 0 ? (healthy / total) * 100 : 100}
        variant="ok"
        onClick={() => onFilterStatus?.('healthy')}
        className={selectedStatus === 'healthy' ? 'border-[#34d399]/50' : ''}
      />

      <StatTile
        label="Yavaş"
        value={degraded}
        unit="gecikmeli"
        icon={<AlertTriangle className="w-4 h-4 text-[#fbbf24]" />}
        progress={total > 0 ? (degraded / total) * 100 : 0}
        variant="warn"
        onClick={() => onFilterStatus?.('degraded')}
        className={selectedStatus === 'degraded' ? 'border-[#fbbf24]/50' : ''}
      />

      <StatTile
        label="Erişilemiyor"
        value={down}
        unit="kesinti"
        icon={<AlertCircle className="w-4 h-4 text-[#f87171]" />}
        progress={total > 0 ? (down / total) * 100 : 0}
        variant="err"
        onClick={() => onFilterStatus?.('down')}
        className={selectedStatus === 'down' ? 'border-[#f87171]/50' : ''}
      />
    </div>
  );
};
