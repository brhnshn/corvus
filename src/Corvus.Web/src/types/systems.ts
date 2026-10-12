export type TelemetryTimeRange = 'live' | '1h' | '24h' | '7d' | '30d';

export type SystemStatus = 'online' | 'degraded' | 'offline' | 'pending' | 'paused';

export interface SystemStatusDto {
  engine: 'sqlite' | 'postgresql';
  isWalMode: boolean;
  retentionDays: number;
  totalSystems: number;
  onlineSystems: number;
  degradedSystems: number;
  offlineSystems: number;
  bufferMemoryBytes: number;
  serverTimeUtc: string;
}

export interface SystemSummaryDto {
  id: string;
  name: string;
  hostname?: string;
  ipAddress?: string;
  osInfo?: string;
  agentVersion?: string;
  tags: string[];
  status: SystemStatus;
  createdAt: string;
  lastSeenAt?: string;
  currentCpuPercent?: number;
  currentRamUsedBytes?: number;
  currentRamTotalBytes?: number;
  currentDiskUsedBytes?: number;
  currentDiskTotalBytes?: number;
  activeContainerCount: number;
  lastPingMs?: number;
  loadAvg1m?: number;
  loadAvg5m?: number;
  loadAvg15m?: number;
  netRxBytesSec?: number;
  netTxBytesSec?: number;
}

export interface SystemContainerCacheEntity {
  systemId: string;
  containerId: string;
  name: string;
  image?: string;
  state: string;
  status?: string;
  cpuPercent: number;
  memoryBytes: number;
  portsJson: string;
  updatedAt: string;
}

export interface SystemTelemetryPoint {
  timestampUnixSeconds: number;
  cpuPercent: number;
  cpuCores: number;
  ramUsedBytes: number;
  ramTotalBytes: number;
  diskUsedBytes: number;
  diskTotalBytes: number;
  netRxBytesSec: number;
  netTxBytesSec: number;
  loadAvg1m: number;
  loadAvg5m: number;
  loadAvg15m: number;
}

export interface SystemDetailDto {
  system: {
    id: string;
    name: string;
    hostname?: string;
    ipAddress?: string;
    osInfo?: string;
    agentVersion?: string;
    tagsJson: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    lastSeenAt?: string;
  };
  tags: string[];
  latestPoint?: SystemTelemetryPoint;
  containers: SystemContainerCacheEntity[];
  totalContainers: number;
  runningContainers: number;
}

export interface SystemDownsampledPoint {
  timestamp: string;
  cpuPercent: number;
  ramUsedBytes: number;
  diskUsedBytes: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

export interface CreateSystemRequest {
  name: string;
  environment?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateSystemRequest {
  name?: string;
  tags?: string[];
  status?: string;
}

export interface CreateSystemResponse {
  system: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
  };
  nodeKey: string;
  hubUrl: string;
}

export interface DockerRpcResponse {
  success: boolean;
  message?: string;
  logs?: string[];
}
