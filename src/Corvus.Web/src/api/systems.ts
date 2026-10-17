import { fetchJson, fetchCachedJson, invalidateCache } from './http';
import type {
  SystemStatusDto,
  SystemSummaryDto,
  SystemDetailDto,
  SystemDownsampledPoint,
  CreateSystemRequest,
  CreateSystemResponse,
  UpdateSystemRequest,
  SystemContainerCacheEntity,
  DockerRpcResponse,
  TelemetryTimeRange
} from '../types';

export const systemsApi = {
  getStatus: () =>
    fetchCachedJson<SystemStatusDto>('/v1/systems/status', undefined, 10000),

  getSystems: () =>
    fetchJson<SystemSummaryDto[]>('/v1/systems'),

  getSystemById: (id: string) =>
    fetchJson<SystemDetailDto>(`/v1/systems/${id}`),

  createSystem: async (req: CreateSystemRequest) => {
    const res = await fetchJson<CreateSystemResponse>('/v1/systems', {
      method: 'POST',
      body: JSON.stringify(req)
    });
    invalidateCache('/v1/systems/status');
    return res;
  },

  updateSystem: async (id: string, req: UpdateSystemRequest) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/v1/systems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(req)
    });
    invalidateCache('/v1/systems');
    return res;
  },

  deleteSystem: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/v1/systems/${id}`, {
      method: 'DELETE'
    });
    invalidateCache('/v1/systems/status');
    return res;
  },

  revokeToken: async (id: string) => {
    return fetchJson<{ success: boolean; message?: string }>(`/v1/systems/${id}/token/revoke`, {
      method: 'POST'
    });
  },

  getMetrics: (id: string, range: TelemetryTimeRange = 'live') =>
    fetchJson<SystemDownsampledPoint[]>(`/v1/systems/${id}/metrics?range=${range}`),

  getSystemContainers: (id: string) =>
    fetchJson<SystemContainerCacheEntity[]>(`/v1/systems/${id}/containers`),

  sendContainerAction: async (id: string, cid: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    return fetchJson<DockerRpcResponse>(`/v1/systems/${id}/containers/${cid}/${action}`, {
      method: 'POST'
    });
  },

  getSystemContainerLogs: async (id: string, cid: string, tail: number = 100) => {
    return fetchJson<DockerRpcResponse>(`/v1/systems/${id}/containers/${cid}/logs?tail=${tail}`);
  }
};
