import { fetchJson, fetchCachedJson, invalidateCache } from './http';
import type { AlertRule, CreateAlertRuleRequest } from '../types';

export const alertsApi = {
  getAlertRules: () =>
    fetchCachedJson<AlertRule[]>('/alerts/rules', undefined, 10000),

  getAlertRule: (id: string) =>
    fetchJson<AlertRule>(`/alerts/rules/${id}`),

  createAlertRule: async (data: CreateAlertRuleRequest) => {
    const res = await fetchJson<AlertRule>('/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    invalidateCache('/alerts/rules');
    return res;
  },

  updateAlertRule: async (id: string, data: Partial<CreateAlertRuleRequest>) => {
    const res = await fetchJson<AlertRule>(`/alerts/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    invalidateCache('/alerts/rules');
    return res;
  },

  deleteAlertRule: async (id: string) => {
    const res = await fetchJson<{ success: boolean }>(`/alerts/rules/${id}`, {
      method: 'DELETE',
    });
    invalidateCache('/alerts/rules');
    return res;
  },
};
