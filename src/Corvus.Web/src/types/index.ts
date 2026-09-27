export interface Service {
  id: string;
  source: 'docker' | 'manual';
  containerId?: string;
  name: string;
  description?: string;
  url?: string;
  icon?: string;
  category?: string;
  healthCheckUrl?: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  createdAt: string;
  updatedAt: string;
  checkType?: 'http' | 'tcp' | 'docker' | 'none';
  port?: number;
  sslExpiryDays?: number;
  sslIssuer?: string;
  isPublic?: boolean;
  isUptimeEnabled?: boolean;
  displayOrder?: number;
  checkInterval?: number;
  maxRetries?: number;
  retryInterval?: number;
  timeoutSeconds?: number;
  ignoreTls?: boolean;
  acceptedStatusCodes?: string;
  httpMethod?: string;
}

export interface TestConnectionRequest {
  checkType?: string;
  url?: string;
  port?: number;
  timeoutSeconds?: number;
  ignoreTls?: boolean;
}

export interface TestConnectionResponse {
  success: boolean;
  statusCode?: number;
  responseTimeMs: number;
  message: string;
}

export interface DockerContainer {
  Id: string;
  Names?: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports?: { IP?: string; PrivatePort: number; PublicPort?: number; Type?: string }[];
  Labels?: Record<string, string>;
}

export interface ContainerStats {
  containerId: string;
  cpuPercent: number;
  memoryUsageBytes: number;
  memoryLimitBytes: number;
  memoryPercent: number;
  networkRxBytes: number;
  networkTxBytes: number;
}

export interface PushMonitor {
  id: string;
  token: string;
  name: string;
  expectedIntervalMinutes: number;
  gracePeriodMinutes: number;
  lastSeenAt?: string;
  status: 'healthy' | 'down' | 'unknown';
  createdAt: string;
}

export interface PublicService {
  id: string;
  name: string;
  description?: string;
  url?: string;
  icon?: string;
  category?: string;
  status: string;
  sslExpiryDays?: number;
  uptimePercentage: number;
  recentChecks: { id: number; status: string; responseTimeMs?: number; checkedAt: string }[];
}

export interface ServiceIncident {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'maintenance';
  isPinned: boolean;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  createdAt: string;
  resolvedAt?: string | null;
}

export interface PublicStatusPage {
  systemStatus: 'all_operational' | 'some_degraded' | 'major_outage' | 'disabled' | 'no_services';
  services: PublicService[];
  generatedAt: string;
  enabled?: boolean;
  message?: string;
  incidents?: ServiceIncident[];
}

export type PublicStatusResponse = PublicStatusPage;

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

export interface BackupEvent {
  id: number;
  token: string;
  receivedAt: string;
  status: 'success' | 'failure';
  sizeBytes?: number;
  message?: string;
}

export interface UptimeCheckItem {
  id: number;
  serviceId: string;
  checkedAt: string;
  status: string;
  responseTimeMs?: number;
  errorMessage?: string;
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

export interface AuthStatus {
  authEnabled: boolean;
  isAuthenticated: boolean;
  username?: string | null;
  hasUsers: boolean;
  registrationEnabled: boolean;
}

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  isUpdateAvailable: boolean;
  releaseUrl: string;
}

export interface DbStatsResponse {
  sizeBytes: number;
  dbSizeBytes: number;
  walSizeBytes: number;
  formattedSize: string;
}
