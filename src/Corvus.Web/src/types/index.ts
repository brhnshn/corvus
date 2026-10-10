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

export interface DockerContainer {
  Id: string;
  Names?: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports?: { IP?: string; PrivatePort: number; PublicPort?: number; Type?: string }[];
  Labels?: Record<string, string>;
  tags?: string[];
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
  role?: 'admin' | 'viewer' | string | null;
  hasUsers: boolean;
  registrationEnabled: boolean;
}

export interface UserDto {
  id: string;
  username: string;
  role: 'admin' | 'viewer' | string;
  createdAt: string;
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

export interface DockerPruneRequest {
  pruneContainers?: boolean;
  pruneImages?: boolean;
  pruneAllImages?: boolean;
  pruneVolumes?: boolean;
  pruneNetworks?: boolean;
  pruneBuildCache?: boolean;
}

export interface DockerPruneResult {
  success: boolean;
  totalSpaceReclaimed: number;
  containersSpaceReclaimed: number;
  containersDeletedCount: number;
  imagesSpaceReclaimed: number;
  imagesDeletedCount: number;
  volumesSpaceReclaimed: number;
  volumesDeletedCount: number;
  networksDeletedCount: number;
  buildCacheSpaceReclaimed: number;
  errorMessage?: string;
}

export interface DockerDfImageInfo {
  id: string;
  repoTags?: string[];
  created: number;
  size: number;
  sharedSize: number;
  containers: number;
}

export interface DockerDfContainerInfo {
  id: string;
  names?: string[];
  image?: string;
  command?: string;
  created: number;
  state?: string;
  status?: string;
  sizeRw: number;
  sizeRootFs: number;
}

export interface DockerDfVolumeInfo {
  name: string;
  driver?: string;
  mountpoint?: string;
  usageData?: {
    size: number;
    refCount: number;
  };
}

export interface DockerDfBuildCacheInfo {
  id: string;
  type?: string;
  description?: string;
  inUse: boolean;
  shared: boolean;
  size: number;
}

export interface DockerSystemDfResponse {
  layersSize: number;
  images?: DockerDfImageInfo[];
  containers?: DockerDfContainerInfo[];
  volumes?: DockerDfVolumeInfo[];
  buildCache?: DockerDfBuildCacheInfo[];
}

export interface DockerSelectivePruneRequest {
  containerIds?: string[];
  imageIds?: string[];
  volumeNames?: string[];
  pruneBuildCache?: boolean;
}

export interface DockerSelectivePruneResult {
  success: boolean;
  totalSpaceReclaimed: number;
  deletedContainers: string[];
  deletedImages: string[];
  deletedVolumes: string[];
  buildCachePruned: boolean;
  errors: string[];
}

export interface DockerRestartPolicy {
  name: string;
  maximumRetryCount?: number;
}

export interface DockerPortBindingHost {
  hostIp?: string;
  hostPort?: string;
}

export interface DockerEndpointSettings {
  ipAddress?: string;
  gateway?: string;
  macAddress?: string;
  networkId?: string;
}

export interface DockerMountInfo {
  type?: string;
  name?: string;
  source?: string;
  destination?: string;
  mode?: string;
  rw?: boolean;
  propagation?: string;
}

export interface DockerContainerConfig {
  image?: string;
  cmd?: string[];
  entrypoint?: string[];
  workingDir?: string;
  user?: string;
  env?: string[];
  labels?: Record<string, string>;
}

export interface DockerContainerState {
  status?: string;
  running: boolean;
  paused?: boolean;
  restarting?: boolean;
  oomKilled?: boolean;
  dead?: boolean;
  pid?: number;
  exitCode?: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  health?: {
    status?: string;
  };
}

export interface DockerHostConfig {
  restartPolicy?: DockerRestartPolicy;
  memory?: number;
  nanoCpus?: number;
  cpuShares?: number;
  networkMode?: string;
  binds?: string[];
  portBindings?: Record<string, DockerPortBindingHost[] | null>;
}

export interface DockerNetworkSettings {
  ipAddress?: string;
  gateway?: string;
  macAddress?: string;
  ports?: Record<string, DockerPortBindingHost[] | null>;
  networks?: Record<string, DockerEndpointSettings>;
}

export interface DockerContainerInspectInfo {
  id: string;
  created?: string;
  path?: string;
  args?: string[];
  name?: string;
  image?: string;
  config?: DockerContainerConfig;
  state?: DockerContainerState;
  hostConfig?: DockerHostConfig;
  networkSettings?: DockerNetworkSettings;
  mounts?: DockerMountInfo[];
}

export interface DockerContainerUpdateRequest {
  nanoCpus?: number;
  memory?: number;
  memoryReservation?: number;
  restartPolicy?: DockerRestartPolicy;
}

export interface ContainerImageUpdateInfo {
  containerId: string;
  image: string;
  hasUpdate: boolean;
  localDigest?: string | null;
  remoteDigest?: string | null;
  registry: string;
  checkedAt: string;
  error?: string | null;
}

export interface ContainerImageRecreateRequest {
  pullLatest?: boolean;
}

export interface ComposeFileDto {
  projectName: string;
  filePath: string;
  content: string;
  lastModified?: string | null;
  exists: boolean;
  error?: string | null;
}

export interface SaveComposeFileRequest {
  content: string;
  restartStack?: boolean;
}

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
  createdAt: string;
}

export interface ActivityLogPagedResult {
  items: ActivityLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


