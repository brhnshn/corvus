import type { Service, DockerContainer, ContainerStats } from '../../api/client';

export type DashboardViewMode = 'classic' | 'console';

export interface TopologyNode {
  id: string;
  name: string;
  kind: 'service' | 'container' | 'proxy' | 'database';
  status: 'ok' | 'warn' | 'err';
  stackName?: string;
  subLabel?: string;
  port?: string;
  x: number;
  y: number;
  refService?: Service;
  refContainer?: DockerContainer;
  stats?: ContainerStats;
}

export interface TopologyEdge {
  fromId: string;
  toId: string;
  status: 'active' | 'broken';
  label?: string;
}

export interface ConsoleTelemetrySummary {
  cpuPercent: number;
  memoryUsageFormatted: string;
  memoryPercent: number;
  networkRxFormatted?: string;
  networkTxFormatted?: string;
  containersRunningCount: number;
  containersTotalCount: number;
  servicesHealthyCount: number;
  servicesTotalCount: number;
}
