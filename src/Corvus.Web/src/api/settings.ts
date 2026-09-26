import { fetchJson, fetchCachedJson, invalidateCache } from './http';
import type { DbStatsResponse, VersionInfo } from '../types';

export const settingsApi = {
  getSettings: () => fetchCachedJson<Record<string, string>>('/settings', undefined, 60000),

  updateSettings: async (settings: Record<string, string>) => {
    const res = await fetchJson<{ success: boolean }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    invalidateCache('/settings');
    return res;
  },

  updateSetting: async (key: string, value: string) => {
    return settingsApi.updateSettings({ [key]: value });
  },

  getDbStats: () => fetchJson<DbStatsResponse>('/settings/db-stats'),

  downloadBackup: async () => {
    const res = await fetch('/api/backup/download');
    if (!res.ok) throw new Error('Yedek indirilemedi');
    return res.blob();
  },

  getVersion: () => fetchCachedJson<VersionInfo>('/version', undefined, 300000),

  testNotification: (data: { channel: string; webhookUrl?: string; botToken?: string; chatId?: string }) => 
    fetchJson<{ success: boolean; message: string }>('/notifications/test', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};
