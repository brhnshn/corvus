import { fetchJson, fetchCachedJson, invalidateCache } from './http';
import type { DockerContainer, ContainerStats } from '../types';

export const containersApi = {
  getContainers: () => fetchCachedJson<DockerContainer[]>('/containers', undefined, 15000),

  getContainerStats: (id: string) => fetchJson<ContainerStats>(`/containers/${id}/stats`),

  getContainersStatsSummary: () =>
    fetchCachedJson<Record<string, ContainerStats>>('/containers/stats-summary', undefined, 5000),

  restartContainer: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/containers/${id}/restart`, {
      method: 'POST'
    });
    invalidateCache('/containers');
    invalidateCache('/services');
    invalidateCache('/dashboard');
    return res;
  },

  startContainer: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/containers/${id}/start`, {
      method: 'POST'
    });
    invalidateCache('/containers');
    invalidateCache('/services');
    invalidateCache('/dashboard');
    return res;
  },

  stopContainer: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/containers/${id}/stop`, {
      method: 'POST'
    });
    invalidateCache('/containers');
    invalidateCache('/services');
    invalidateCache('/dashboard');
    return res;
  },

  pauseContainer: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/containers/${id}/pause`, {
      method: 'POST'
    });
    invalidateCache('/containers');
    invalidateCache('/services');
    invalidateCache('/dashboard');
    return res;
  },

  unpauseContainer: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/containers/${id}/unpause`, {
      method: 'POST'
    });
    invalidateCache('/containers');
    invalidateCache('/services');
    invalidateCache('/dashboard');
    return res;
  },

  getContainerLogs: (id: string, tail = 100) => 
    fetchJson<{ containerId: string; lines: string[] }>(`/containers/${id}/logs?tail=${tail}`),

  systemPrune: async (options: import('../types').DockerPruneRequest) => {
    const res = await fetchJson<import('../types').DockerPruneResult>('/containers/prune', {
      method: 'POST',
      body: JSON.stringify(options)
    });
    invalidateCache('/containers');
    invalidateCache('/dashboard');
    return res;
  },

  getSystemDf: () => 
    fetchJson<import('../types').DockerSystemDfResponse>('/containers/system-df'),

  selectivePrune: async (options: import('../types').DockerSelectivePruneRequest) => {
    const res = await fetchJson<import('../types').DockerSelectivePruneResult>('/containers/prune/selective', {
      method: 'POST',
      body: JSON.stringify(options)
    });
    invalidateCache('/containers');
    invalidateCache('/dashboard');
    return res;
  },

  updateContainerTags: async (id: string, tags: string[]): Promise<boolean> => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/containers/${id}/tags`, {
      method: 'PUT',
      body: JSON.stringify({ tags })
    });
    invalidateCache('/containers');
    invalidateCache('/services');
    invalidateCache('/dashboard');
    return res.success;
  },

  inspectContainer: (id: string) =>
    fetchJson<import('../types').DockerContainerInspectInfo>(`/containers/${id}/inspect`),

  updateContainer: async (id: string, req: import('../types').DockerContainerUpdateRequest) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/containers/${id}/update`, {
      method: 'POST',
      body: JSON.stringify(req)
    });
    invalidateCache('/containers');
    invalidateCache('/services');
    invalidateCache('/dashboard');
    return res;
  }
};
