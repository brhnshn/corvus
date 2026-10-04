import React from 'react';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { formatBytes } from '../../utils/format';
import type { DockerContainer, ContainerStats } from '../../types';

export interface TopResourcesCardProps {
  containers: DockerContainer[];
  statsMap?: Record<string, ContainerStats>;
}

export const TopResourcesCard: React.FC<TopResourcesCardProps> = ({
  containers,
  statsMap = {},
}) => {
  // Konteynerleri RAM kullanımına göre sırala
  const containerListWithStats = containers.map((c) => {
    const cleanName = (c.Names?.[0] || c.Id).replace(/^\//, '');
    const stat = statsMap[c.Id];
    const ramBytes = stat?.memoryUsageBytes ?? 0;
    const ramPercent = stat?.memoryPercent ?? 0;
    return {
      id: c.Id,
      name: cleanName,
      ramBytes,
      ramPercent,
    };
  });

  // RAM'e göre azalan sırala, ilk 5'i al
  const topContainers = containerListWithStats
    .sort((a, b) => b.ramBytes - a.ramBytes)
    .slice(0, 5);

  const maxRam = Math.max(...topContainers.map((c) => c.ramBytes), 1024 * 1024 * 100);

  return (
    <section className="surface rounded-[22px] p-4 sm:p-5 flex flex-col justify-between animate-rv" style={{ animationDelay: '240ms' }}>
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <b className="text-base font-semibold text-[#eceef6] block leading-snug">
            En Çok Kaynak Kullananlar
          </b>
          <small className="font-mono text-xs text-[#9ba0b5]">
            RAM'e göre ilk 5 konteyner
          </small>
        </div>
      </div>

      {topContainers.length === 0 ? (
        <div className="text-center py-6 text-xs text-[#9ba0b5]">
          Henüz kaynak istatistiği toplanmadı
        </div>
      ) : (
        <div className="space-y-3">
          {topContainers.map((item) => {
            const ratio = Math.min(100, Math.max(8, Math.round((item.ramBytes / maxRam) * 100)));
            const ramLabel = item.ramBytes > 0 ? formatBytes(item.ramBytes) : 'Belirsiz';

            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#eceef6] truncate max-w-[200px]">
                    {item.name}
                  </span>
                  <span className="font-mono text-[11.5px] text-[#9ba0b5]">
                    {ramLabel}
                  </span>
                </div>
                {/* Midnight v2: Durumsuz oran çubuğu tek renk nötr (neutral-bar) */}
                <ProgressBar value={ratio} variant="neutral" height={5} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
