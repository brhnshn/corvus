export interface DockerContainer {
  Id: string;
  Names?: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports?: { IP?: string; PrivatePort: number; PublicPort?: number; Type?: string }[];
  Labels?: Record<string, string>;
  NetworkSettings?: {
    IPAddress?: string;
    Networks?: Record<string, { NetworkID?: string; IPAddress?: string }>;
  };
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
  memorySwap?: number;
  memoryReservation?: number;
  cpuLimitCores?: number;
  memoryLimitMb?: number;
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
  memorySwap?: number;
  memoryReservation?: number;
  restartPolicy?: DockerRestartPolicy;
}

export interface ContainerResourceUpdateRequest {
  cpuCores?: number;
  memoryMb?: number;
  memorySwapMb?: number;
  restartPolicy?: string;
  maximumRetryCount?: number;
}

export interface ContainerResourcesUpdatedEventPayload {
  containerId: string;
  cpuCores?: number;
  memoryMb?: number;
  restartPolicy?: string;
  maximumRetryCount?: number;
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
  envContent?: string | null;
  envFilePath?: string | null;
  envExists?: boolean;
  lastModified?: string | null;
  exists: boolean;
  error?: string | null;
}

export interface SaveComposeFileRequest {
  content: string;
  envContent?: string | null;
  restartStack?: boolean;
}

export interface ComposeDeployResult {
  success: boolean;
  output: string;
  exitCode: number;
  error?: string | null;
}
