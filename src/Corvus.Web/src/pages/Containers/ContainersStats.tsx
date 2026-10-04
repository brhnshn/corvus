import React from 'react';
import { Boxes, Play, Pause, Square } from 'lucide-react';
import { StatTile } from '../../components/ui/StatTile';
import type { DockerContainer } from '../../types';

export interface ContainersStatsProps {
  containers: DockerContainer[];
  selectedState?: string | null;
  onFilterState?: (state: string | null) => void;
}

export const ContainersStats: React.FC<ContainersStatsProps> = ({
  containers,
  selectedState,
  onFilterState,
}) => {
  const total = containers.length;
  const running = containers.filter((c) => c.State.toLowerCase() === 'running').length;
  const paused = containers.filter((c) => c.State.toLowerCase() === 'paused').length;
  const stopped = containers.filter((c) => ['exited', 'dead', 'created'].includes(c.State.toLowerCase())).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 mb-3.5 animate-rv">
      <StatTile
        label="Toplam Konteyner"
        value={total}
        unit="konteyner"
        icon={<Boxes className="w-4 h-4" />}
        onClick={() => onFilterState?.(null)}
        className={selectedState === null ? 'border-white/30' : ''}
      />

      <StatTile
        label="Çalışıyor"
        value={running}
        unit="aktif"
        icon={<Play className="w-4 h-4 text-[#34d399]" />}
        progress={total > 0 ? (running / total) * 100 : 100}
        variant="ok"
        onClick={() => onFilterState?.('running')}
        className={selectedState === 'running' ? 'border-[#34d399]/50' : ''}
      />

      <StatTile
        label="Duraklatıldı"
        value={paused}
        unit="beklemede"
        icon={<Pause className="w-4 h-4 text-[#fbbf24]" />}
        progress={total > 0 ? (paused / total) * 100 : 0}
        variant="warn"
        onClick={() => onFilterState?.('paused')}
        className={selectedState === 'paused' ? 'border-[#fbbf24]/50' : ''}
      />

      <StatTile
        label="Durdu"
        value={stopped}
        unit="kapalı"
        icon={<Square className="w-4 h-4 text-[#f87171]" />}
        progress={total > 0 ? (stopped / total) * 100 : 0}
        variant="err"
        onClick={() => onFilterState?.('stopped')}
        className={selectedState === 'stopped' ? 'border-[#f87171]/50' : ''}
      />
    </div>
  );
};
