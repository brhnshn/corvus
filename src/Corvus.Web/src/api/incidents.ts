import { fetchJson, invalidateCache } from './http';
import type { ServiceIncident } from '../types';

export interface CreateIncidentPayload {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical' | 'maintenance';
  isPinned?: boolean;
  status?: 'investigating' | 'identified' | 'monitoring' | 'resolved';
}

export interface UpdateIncidentPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'maintenance';
  isPinned: boolean;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
}

export const incidentsApi = {
  getIncidents: () => fetchJson<ServiceIncident[]>('/incidents'),

  createIncident: async (data: CreateIncidentPayload) => {
    const res = await fetchJson<ServiceIncident>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    invalidateCache('/incidents');
    invalidateCache('/status-page');
    return res;
  },

  updateIncident: async (id: string, data: UpdateIncidentPayload) => {
    const res = await fetchJson<ServiceIncident>(`/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    invalidateCache('/incidents');
    invalidateCache('/status-page');
    return res;
  },

  resolveIncident: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/incidents/${id}/resolve`, {
      method: 'POST'
    });
    invalidateCache('/incidents');
    invalidateCache('/status-page');
    return res;
  },

  deleteIncident: async (id: string) => {
    const res = await fetchJson<{ success: boolean; message?: string }>(`/incidents/${id}`, {
      method: 'DELETE'
    });
    invalidateCache('/incidents');
    invalidateCache('/status-page');
    return res;
  }
};

export const getIncidents = incidentsApi.getIncidents;
export const createIncident = incidentsApi.createIncident;
export const updateIncident = incidentsApi.updateIncident;
export const resolveIncident = incidentsApi.resolveIncident;
export const deleteIncident = incidentsApi.deleteIncident;
