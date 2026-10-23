export interface Service {
  id: string;
  source: 'docker' | 'manual';
  containerId?: string;
  systemId?: string;
  name: string;
  description?: string;
  url?: string;
  icon?: string;
  category?: string;
  healthCheckUrl?: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  createdAt: string;
  updatedAt: string;
  checkType?: 'http' | 'tcp' | 'docker' | 'none' | 'ping';
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
  expectedBody?: string;
  tags?: string[];
}

export interface TestConnectionRequest {
  checkType?: string;
  url?: string;
  port?: number;
  timeoutSeconds?: number;
  ignoreTls?: boolean;
  expectedBody?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  statusCode?: number;
  responseTimeMs: number;
  message: string;
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

export interface UptimeCheckItem {
  id: number;
  serviceId: string;
  checkedAt: string;
  status: string;
  responseTimeMs?: number;
  errorMessage?: string;
}
