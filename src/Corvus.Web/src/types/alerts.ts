export interface AlertRule {
  id: string;
  name: string;
  targetType: string;
  targetId?: string | null;
  metric: string;
  operator: string;
  thresholdValue: number;
  durationSeconds: number;
  cooldownMinutes: number;
  isEnabled: boolean;
  isFiring: boolean;
  violationStartAt?: string | null;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  targetType: string;
  targetId?: string | null;
  metric: string;
  operator: string;
  thresholdValue: number;
  durationSeconds: number;
  cooldownMinutes: number;
  isEnabled: boolean;
}

export interface ActivityLogEntry {
  id: string;
  actorUsername: string;
  actionType: string;
  category: string;
  targetResource: string;
  detailsJson?: string | null;
  ipAddress?: string | null;
  systemId?: string | null;
  createdAt: string;
}

export interface ActivityLogPagedResult {
  items: ActivityLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
