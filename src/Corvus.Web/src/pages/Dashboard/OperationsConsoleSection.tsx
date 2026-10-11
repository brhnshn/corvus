import React, { useMemo, useState } from 'react';
import type { Service, DockerContainer, ContainerStats, DashboardSummary } from '../../types';
import { useI18n } from '../../i18n';
import { computeTopology } from './console/topologyUtils';
import { ConsoleTopologyStage } from './console/ConsoleTopologyStage';
import { ConsoleInventoryPanel } from './console/ConsoleInventoryPanel';
import { ConsoleDetailInspectPanel } from './console/ConsoleDetailInspectPanel';
import { ConsoleTelemetryStrip } from './console/ConsoleTelemetryStrip';
import type { ConsoleTelemetrySummary, TopologyNode } from './types';

interface OperationsConsoleSectionProps {
  services: Service[];
  containers: DockerContainer[];
  containerStats: Record<string, ContainerStats>;
  summary: DashboardSummary | null;
  onRefreshData: () => void;
}

export const OperationsConsoleSection: React.FC<OperationsConsoleSectionProps> = ({
  services,
  containers,
  containerStats,
  summary,
  onRefreshData,
}) => {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Canlı verilerden topoloji düğümleri ve kenarlarını hesapla
  const { nodes, edges } = useMemo(
    () => computeTopology(services, containers, containerStats),
    [services, containers, containerStats]
  );

  // İlk açılışta veya seçili öğe yoksa: varsa hatalı olanı, yoksa ilkini seç
  const activeSelectedId = useMemo(() => {
    if (selectedId && nodes.some((n: TopologyNode) => n.id === selectedId)) {
      return selectedId;
    }
    const errNode = nodes.find((n: TopologyNode) => n.status === 'err');
    if (errNode) return errNode.id;
    return nodes[0]?.id || null;
  }, [selectedId, nodes]);

  const selectedNode = useMemo(
    () => nodes.find((n: TopologyNode) => n.id === activeSelectedId) || null,
    [nodes, activeSelectedId]
  );

  // Telemetri Özetini Hesapla
  const telemetrySummary: ConsoleTelemetrySummary = useMemo(() => {
    const latest = summary?.latestMetrics;
    const cpu = latest?.cpuPercent ?? 0;
    const memUsageMb = latest?.ramUsedMb ?? 0;
    const memTotalMb = latest?.ramTotalMb ?? 1;
    const memPercent = (memUsageMb / memTotalMb) * 100;

    const runningCnt = containers.filter((c) => c.State.toLowerCase() === 'running').length;
    const healthySvc = services.filter((s) => s.status === 'healthy').length;

    return {
      cpuPercent: cpu,
      memoryUsageFormatted: `${(memUsageMb / 1024).toFixed(1)}G / ${(memTotalMb / 1024).toFixed(1)}G`,
      memoryPercent: memPercent,
      containersRunningCount: runningCnt,
      containersTotalCount: containers.length,
      servicesHealthyCount: healthySvc,
      servicesTotalCount: services.length,
    };
  }, [summary, containers, services]);

  const [isInspectExpanded, setIsInspectExpanded] = useState(false);

  return (
    <div className={`flex flex-col ${isInspectExpanded ? 'lg:grid lg:grid-cols-[280px_1fr]' : 'lg:grid lg:grid-cols-[280px_1fr_420px]'} h-[calc(100vh-180px)] min-h-[580px] bg-[#090a0f] border border-[#1e2433] rounded-lg overflow-hidden shadow-2xl transition-all duration-200`}>
      {/* 1. Sol: Servis & Konteyner Envanteri */}
      <div className="h-64 lg:h-full overflow-hidden">
        <ConsoleInventoryPanel
          nodes={nodes}
          selectedId={activeSelectedId}
          onSelectNode={setSelectedId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* 2. Orta: Mimari Topoloji & Telemetri Çubuğu (Genişletilmişse gizle veya daralt) */}
      {!isInspectExpanded && (
        <div className="flex flex-col h-full overflow-hidden bg-[#090a0f]">
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#0e1117] border-b border-[#1e2433] text-[11px] font-mono text-[#94a3b8] shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse" />
              <span className="font-semibold text-[#f1f5f9] tracking-wider uppercase">{t('dashboard.console.topologyTitle')}</span>
            </div>
            <span className="text-[10px] text-[#64748b]">{t('dashboard.console.topologySubtitle')}</span>
          </div>

          {/* Topoloji Sahnesi */}
          <div className="flex-1 overflow-hidden relative">
            <ConsoleTopologyStage
              nodes={nodes}
              edges={edges}
              selectedId={activeSelectedId}
              onSelectNode={setSelectedId}
            />
          </div>

          {/* Alt Telemetri Şeridi */}
          <ConsoleTelemetryStrip summary={telemetrySummary} />
        </div>
      )}

      {/* 3. Sağ: İnceleme & Canlı Terminal Akışı */}
      <div className={`h-80 lg:h-full overflow-hidden ${isInspectExpanded ? 'col-span-1' : ''}`}>
        <ConsoleDetailInspectPanel
          selectedNode={selectedNode}
          onRefreshData={onRefreshData}
          isExpanded={isInspectExpanded}
          onToggleExpand={() => setIsInspectExpanded(!isInspectExpanded)}
        />
      </div>
    </div>
  );
};
