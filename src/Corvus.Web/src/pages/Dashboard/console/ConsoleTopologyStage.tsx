import React, { useMemo } from 'react';
import type { TopologyNode, TopologyEdge } from '../types';

interface ConsoleTopologyStageProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  selectedId: string | null;
  onSelectNode: (id: string) => void;
}

export const ConsoleTopologyStage: React.FC<ConsoleTopologyStageProps> = ({
  nodes,
  edges,
  selectedId,
  onSelectNode,
}) => {
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Compose Stack Gruplarını hesapla
  const stackGroups = useMemo(() => {
    const groups = new Map<string, { minX: number; maxX: number; minY: number; maxY: number; count: number }>();
    nodes.forEach((n) => {
      if (!n.stackName) return;
      const existing = groups.get(n.stackName);
      if (!existing) {
        groups.set(n.stackName, {
          minX: n.x,
          maxX: n.x + 170,
          minY: n.y,
          maxY: n.y + 48,
          count: 1,
        });
      } else {
        existing.minX = Math.min(existing.minX, n.x);
        existing.maxX = Math.max(existing.maxX, n.x + 170);
        existing.minY = Math.min(existing.minY, n.y);
        existing.maxY = Math.max(existing.maxY, n.y + 48);
        existing.count += 1;
      }
    });

    // Sadece 1'den fazla üyesi olan grupları çerçevele
    return Array.from(groups.entries()).filter(([_, g]) => g.count > 1);
  }, [nodes]);

  // Canvas boyutunu düğümlerin pozisyonuna göre esnet
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y), 240);
  const maxX = nodes.reduce((m, n) => Math.max(m, n.x), 700);
  const viewHeight = Math.max(320, maxY + 70);
  const viewWidth = Math.max(760, maxX + 160);

  return (
    <div className="relative w-full h-full min-h-[280px] overflow-auto select-none bg-[#090a0f] border-b border-[#1e2433] scrollbar-thin">
      <svg
        className="w-full h-full min-w-[760px]"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Izgara Arka Plan Noktaları */}
        <defs>
          <pattern id="topoGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#1e2433" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topoGrid)" opacity="0.6" />

        {/* 1. Stack Çerçeveleri (Compose Group Boxes) */}
        <g className="stacks-layer">
          {stackGroups.map(([stackName, g]) => {
            const pad = 10;
            const x = g.minX - pad;
            const y = g.minY - pad - 12;
            const width = g.maxX - g.minX + pad * 2;
            const height = g.maxY - g.minY + pad * 2 + 12;

            return (
              <g key={`stack-${stackName}`}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx="6"
                  fill="rgba(56, 189, 248, 0.03)"
                  stroke="rgba(56, 189, 248, 0.2)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={x + 8}
                  y={y + 12}
                  fill="#38bdf8"
                  fontSize="9.5"
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                  letterSpacing="0.05em"
                >
                  STACK: {stackName.toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>

        {/* 2. Kenar Çizgileri (Edges) */}
        <g className="edges-layer">
          {edges.map((e, idx) => {
            const n1 = nodeMap.get(e.fromId);
            const n2 = nodeMap.get(e.toId);
            if (!n1 || !n2) return null;

            const isBroken = e.status === 'broken';
            const strokeColor = isBroken ? '#ef4444' : '#334155';
            const dashArray = isBroken ? '3 4' : '4 4';

            // Eğri (Bezier) hesapla
            const x1 = n1.x + 85;
            const y1 = n1.y + 24;
            const x2 = n2.x + 85;
            const y2 = n2.y + 24;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`edge-${idx}`} className="group/edge">
                <path
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  stroke={strokeColor}
                  strokeWidth="1.2"
                  strokeDasharray={dashArray}
                  strokeOpacity="0.4"
                  fill="none"
                  className="transition-opacity group-hover/edge:stroke-opacity-100"
                />
              </g>
            );
          })}
        </g>

        {/* 3. Düğümler (Nodes) */}
        <g className="nodes-layer">
          {nodes.map((node) => {
            const isSelected = node.id === selectedId;
            const statusColor =
              node.status === 'err'
                ? '#ef4444'
                : node.status === 'warn'
                ? '#f59e0b'
                : '#10b981';

            const borderColor = isSelected
              ? '#38bdf8'
              : node.status === 'err'
              ? '#ef4444'
              : '#2d3748';

            const bgColor = isSelected ? '#141822' : '#0e1117';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onSelectNode(node.id)}
                className="cursor-pointer group"
              >
                {/* Node Kutusu */}
                <rect
                  width="170"
                  height="48"
                  rx="6"
                  fill={bgColor}
                  stroke={borderColor}
                  strokeWidth={isSelected ? '2' : '1'}
                  className="transition-all duration-150 group-hover:stroke-[#4a5568]"
                />

                {/* Durum Noktası */}
                <circle cx="14" cy="20" r="4.5" fill={statusColor} />

                {/* İsim */}
                <text
                  x="26"
                  y="23"
                  fill="#f1f5f9"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {node.name.length > 18 ? `${node.name.slice(0, 17)}…` : node.name}
                </text>

                {/* Alt Metin / Port / SLA */}
                <text
                  x="26"
                  y="38"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {node.port ? `:${node.port}` : node.subLabel?.slice(0, 22) || ''}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
