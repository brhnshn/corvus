import type { BackupEvent } from './platform';

export interface SystemMetric {
  id: number;
  recordedAt: string;
  cpuPercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

export interface SystemTelemetryStreamDto {
  systemId: string;
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
  runningContainersCount: number;
}

export interface DashboardSummary {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  downServices: number;
  totalContainers: number;
  runningContainers: number;
  lastBackup?: BackupEvent;
  latestMetrics?: SystemMetric;
}
