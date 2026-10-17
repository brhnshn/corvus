import type { 
  DockerContainerInspectInfo, 
  DockerContainerConfig, 
  DockerHostConfig, 
  DockerNetworkSettings, 
  DockerMountInfo,
  DockerContainerState,
  DockerEndpointSettings,
  DockerPortBindingHost
} from '../../../types';

/**
 * Docker Engine API çıktısı PascalCase ("Config", "NetworkSettings") veya
 * camelCase ("config", "networkSettings") olabilmektedir.
 * Bu yardımcı modül, her iki durumda da verilerin güvenle ve eksiksiz okunmasını sağlar.
 */

export function getInspectConfig(inspect?: DockerContainerInspectInfo | null): DockerContainerConfig {
  if (!inspect) return {};
  const raw = inspect as unknown as Record<string, unknown>;
  return (inspect.config || raw.Config || {}) as DockerContainerConfig;
}

export function getInspectEnv(inspect?: DockerContainerInspectInfo | null): string[] {
  const config = getInspectConfig(inspect);
  const rawConfig = config as unknown as Record<string, unknown>;
  const env = config.env || rawConfig.Env;
  return Array.isArray(env) ? (env as string[]) : [];
}

export function getInspectHostConfig(inspect?: DockerContainerInspectInfo | null): DockerHostConfig {
  if (!inspect) return {};
  const raw = inspect as unknown as Record<string, unknown>;
  const host = (inspect.hostConfig || raw.HostConfig || {}) as Record<string, unknown>;
  const rawPolicy = (host.restartPolicy || host.RestartPolicy || {}) as Record<string, unknown>;

  const nanoCpus = typeof host.nanoCpus === 'number'
    ? host.nanoCpus
    : typeof host.NanoCpus === 'number'
      ? (host.NanoCpus as number)
      : undefined;

  const memory = typeof host.memory === 'number'
    ? host.memory
    : typeof host.Memory === 'number'
      ? (host.Memory as number)
      : undefined;

  const memorySwap = typeof host.memorySwap === 'number'
    ? host.memorySwap
    : typeof host.MemorySwap === 'number'
      ? (host.MemorySwap as number)
      : undefined;

  const memoryReservation = typeof host.memoryReservation === 'number'
    ? host.memoryReservation
    : typeof host.MemoryReservation === 'number'
      ? (host.MemoryReservation as number)
      : undefined;

  const cpuShares = typeof host.cpuShares === 'number'
    ? host.cpuShares
    : typeof host.CpuShares === 'number'
      ? (host.CpuShares as number)
      : undefined;

  const cpuLimitCores = typeof host.cpuLimitCores === 'number'
    ? host.cpuLimitCores
    : typeof host.CpuLimitCores === 'number'
      ? (host.CpuLimitCores as number)
      : (typeof nanoCpus === 'number' && nanoCpus > 0 ? nanoCpus / 1_000_000_000 : undefined);

  const memoryLimitMb = typeof host.memoryLimitMb === 'number'
    ? host.memoryLimitMb
    : typeof host.MemoryLimitMb === 'number'
      ? (host.MemoryLimitMb as number)
      : (typeof memory === 'number' && memory > 0 ? Math.round(memory / (1024 * 1024)) : undefined);

  const policyName = (rawPolicy.name || rawPolicy.Name || 'no') as string;
  const maxRetries = typeof rawPolicy.maximumRetryCount === 'number'
    ? rawPolicy.maximumRetryCount
    : typeof rawPolicy.MaximumRetryCount === 'number'
      ? (rawPolicy.MaximumRetryCount as number)
      : 0;

  return {
    nanoCpus,
    memory,
    memorySwap,
    memoryReservation,
    cpuShares,
    cpuLimitCores,
    memoryLimitMb,
    networkMode: (host.networkMode || host.NetworkMode || '') as string,
    restartPolicy: {
      name: policyName,
      maximumRetryCount: maxRetries
    },
    binds: Array.isArray(host.binds || host.Binds) ? ((host.binds || host.Binds) as string[]) : undefined,
    portBindings: (host.portBindings || host.PortBindings) as Record<string, DockerPortBindingHost[] | null> | undefined
  };
}

export function getInspectNetworkSettings(inspect?: DockerContainerInspectInfo | null): DockerNetworkSettings {
  if (!inspect) return {};
  const raw = inspect as unknown as Record<string, unknown>;
  return (inspect.networkSettings || raw.NetworkSettings || {}) as DockerNetworkSettings;
}

export function getInspectState(inspect?: DockerContainerInspectInfo | null): Partial<DockerContainerState> {
  if (!inspect) return {};
  const raw = inspect as unknown as Record<string, unknown>;
  const state = (inspect.state || raw.State || {}) as Record<string, unknown>;
  return {
    status: (state.status || state.Status || '') as string,
    running: Boolean(state.running ?? state.Running ?? false),
    paused: Boolean(state.paused ?? state.Paused ?? false),
    restarting: Boolean(state.restarting ?? state.Restarting ?? false),
    oomKilled: Boolean(state.oomKilled ?? state.OOMKilled ?? false),
    dead: Boolean(state.dead ?? state.Dead ?? false),
    pid: typeof state.pid === 'number' ? state.pid : typeof state.Pid === 'number' ? (state.Pid as number) : undefined,
    exitCode: typeof state.exitCode === 'number' ? state.exitCode : typeof state.ExitCode === 'number' ? (state.ExitCode as number) : undefined,
    startedAt: (state.startedAt || state.StartedAt || '') as string,
    finishedAt: (state.finishedAt || state.FinishedAt || '') as string,
    health: (state.health || state.Health) as { status?: string } | undefined
  };
}

export function getInspectMounts(inspect?: DockerContainerInspectInfo | null): DockerMountInfo[] {
  if (!inspect) return [];
  const raw = inspect as unknown as Record<string, unknown>;
  const mounts = inspect.mounts || raw.Mounts;
  if (Array.isArray(mounts)) {
    return mounts.map((m: Record<string, unknown>) => ({
      type: (m.type || m.Type || '') as string,
      name: (m.name || m.Name || '') as string,
      source: (m.source || m.Source || '') as string,
      destination: (m.destination || m.Destination || '') as string,
      mode: (m.mode || m.Mode || '') as string,
      rw: Boolean(m.rw ?? m.RW ?? false),
      propagation: (m.propagation || m.Propagation || '') as string
    }));
  }
  return [];
}

export function getInspectPorts(inspect?: DockerContainerInspectInfo | null): Record<string, DockerPortBindingHost[] | null> {
  const net = getInspectNetworkSettings(inspect);
  const host = getInspectHostConfig(inspect);
  const rawNet = net as unknown as Record<string, unknown>;
  const rawHost = host as unknown as Record<string, unknown>;

  const portsMap = (net.ports || rawNet.Ports || host.portBindings || rawHost.PortBindings || {}) as Record<string, unknown>;
  const normalized: Record<string, DockerPortBindingHost[] | null> = {};

  for (const [key, value] of Object.entries(portsMap)) {
    if (Array.isArray(value)) {
      normalized[key] = value.map((b: Record<string, unknown>) => ({
        hostIp: (b.hostIp || b.HostIp || '') as string,
        hostPort: (b.hostPort || b.HostPort || '') as string
      }));
    } else {
      normalized[key] = null;
    }
  }

  return normalized;
}

export function getInspectNetworks(inspect?: DockerContainerInspectInfo | null): Record<string, DockerEndpointSettings> {
  const net = getInspectNetworkSettings(inspect);
  const rawNet = net as unknown as Record<string, unknown>;
  const networksMap = (net.networks || rawNet.Networks || {}) as Record<string, unknown>;

  const normalized: Record<string, DockerEndpointSettings> = {};
  for (const [key, value] of Object.entries(networksMap)) {
    if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>;
      normalized[key] = {
        ipAddress: (v.ipAddress || v.IPAddress || '') as string,
        gateway: (v.gateway || v.Gateway || '') as string,
        macAddress: (v.macAddress || v.MacAddress || '') as string,
        networkId: (v.networkId || v.NetworkID || '') as string
      };
    }
  }

  return normalized;
}
