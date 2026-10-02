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
  }
};
