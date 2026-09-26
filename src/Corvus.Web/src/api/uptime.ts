import { fetchJson, fetchCachedJson, invalidateCache } from './http';
import type { 
  PublicStatusPage, 
  PushMonitor, 
  UptimeCheckItem, 
  TestConnectionRequest, 
  TestConnectionResponse, 
  Service 
} from '../types';

export const uptimeApi = {
  getPublicStatusPage: () => fetchJson<PublicStatusPage>('/status-page'),

  getPushMonitors: () => fetchCachedJson<PushMonitor[]>('/push-monitors', undefined, 30000),

  createPushMonitor: async (data: { name: string; token?: string; expectedIntervalMinutes: number; gracePeriodMinutes: number }) => {
    const res = await fetchJson<PushMonitor>('/push-monitors', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    invalidateCache('/push-monitors');
    return res;
  },

  updatePushMonitor: async (id: string, data: { name: string; expectedIntervalMinutes: number; gracePeriodMinutes: number }) => {
    const res = await fetchJson<PushMonitor>(`/push-monitors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    invalidateCache('/push-monitors');
    return res;
  },

  deletePushMonitor: async (id: string) => {
    const res = await fetchJson<{ success: boolean }>(`/push-monitors/${id}`, {
      method: 'DELETE'
    });
    invalidateCache('/push-monitors');
    return res;
  },

  getUptimeChecks: (serviceId: string, range = '7d') => 
    fetchJson<UptimeCheckItem[]>(`/uptime?service_id=${serviceId}&range=${range}`),

  testConnection: (req: TestConnectionRequest) =>
    fetchJson<TestConnectionResponse>('/uptime/test-connection', {
      method: 'POST',
      body: JSON.stringify(req)
    }),

  enableUptime: async (serviceId: string, options: Partial<Service> = {}) => {
    const res = await fetchJson<Service>(`/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...options,
        isUptimeEnabled: true
      })
    });
    invalidateCache('/services');
    return res;
  },

  disableUptime: async (serviceId: string) => {
    const res = await fetchJson<Service>(`/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify({
        isUptimeEnabled: false,
        isPublic: false
      })
    });
    invalidateCache('/services');
    return res;
  }
};

export const testConnection = uptimeApi.testConnection;
export const enableUptime = uptimeApi.enableUptime;
export const disableUptime = uptimeApi.disableUptime;
