import React, { useMemo } from 'react';
import { useI18n } from '../../../i18n';
import type { TopologyNode } from '../types';

interface ConsoleInventoryPanelProps {
  nodes: TopologyNode[];
  selectedId: string | null;
  onSelectNode: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const ConsoleInventoryPanel: React.FC<ConsoleInventoryPanelProps> = ({
  nodes,
  selectedId,
  onSelectNode,
  searchQuery,
  onSearchChange,
}) => {
  const { t } = useI18n();

  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        n.kind.toLowerCase().includes(q) ||
        (n.stackName && n.stackName.toLowerCase().includes(q)) ||
        (n.subLabel && n.subLabel.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#0e1117] border-r border-[#1e2433] select-none">
      {/* Başlık Şeridi */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1e2433] bg-[#0e1117] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold tracking-wider text-[#94a3b8] uppercase">
            {t('dashboard.console.inventoryTitle')}
          </span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#141822] text-[#f1f5f9] border border-[#1e2433]">
            {nodes.length}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#64748b]">
          {t('dashboard.console.inventoryLive')}
        </span>
      </div>

      {/* Arama / Filtre Çubuğu */}
      <div className="p-2 border-b border-[#1e2433] bg-[#090a0f]">
        <input
          id="console-inventory-search"
          name="consoleInventorySearch"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('dashboard.console.searchPlaceholder')}
          className="w-full bg-[#0e1117] border border-[#1e2433] rounded px-2.5 py-1 text-xs text-[#f1f5f9] placeholder-[#64748b] font-mono outline-none focus:border-[#4a5568]"
        />
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1e2433] scrollbar-thin">
        {filteredNodes.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#64748b] font-mono">
            {t('dashboard.console.noResults')}
          </div>
        ) : (
          filteredNodes.map((n) => {
            const isSelected = n.id === selectedId;
            const statusBg =
              n.status === 'err'
                ? 'bg-[#ef4444]'
                : n.status === 'warn'
                ? 'bg-[#f59e0b]'
                : 'bg-[#10b981]';

            const metricText = n.stats
              ? `${n.stats.cpuPercent.toFixed(1)}%`
              : n.refService
              ? n.refService.status.toUpperCase()
              : n.status.toUpperCase();

            return (
              <div
                key={n.id}
                onClick={() => onSelectNode(n.id)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#141822] border-l-2 border-[#38bdf8]'
                    : 'hover:bg-[#1a202c]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusBg}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-[#f1f5f9] truncate">
                        {n.name}
                      </span>
                      {n.stackName ? (
                        <span className="text-[9px] px-1 py-0.2 bg-[#1e2433] text-[#38bdf8] rounded font-mono truncate max-w-[80px]">
                          {n.stackName}
                        </span>
                      ) : (
                        <span className="text-[9px] px-1 py-0.2 bg-[#090a0f] border border-[#1e2433] rounded text-[#64748b] font-mono">
                          {n.kind}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748b] font-mono truncate">
                      {n.port ? `:${n.port}` : n.subLabel || '—'}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] shrink-0">
                  <span
                    className={
                      n.status === 'err'
                        ? 'text-[#ef4444] font-semibold'
                        : n.status === 'warn'
                        ? 'text-[#f59e0b]'
                        : 'text-[#94a3b8]'
                    }
                  >
                    {metricText}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
