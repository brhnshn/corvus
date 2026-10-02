import { fetchJson, invalidateCache } from './http';
import type { AuthStatus } from '../types';

export const authApi = {
  getAuthStatus: () => fetchJson<AuthStatus>('/auth/status'),

  login: async (data: { username: string; password: string }) => {
    const res = await fetchJson<{ success: boolean; message?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    invalidateCache();
    return res;
  },

  register: async (data: { username: string; password: string }) => {
    const res = await fetchJson<{ success: boolean; message?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    invalidateCache();
    return res;
  },

  toggleRegistration: (enabled: boolean) => 
    fetchJson<{ success: boolean; message?: string }>('/auth/toggle-registration', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    fetchJson<{ success: boolean; message?: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getUsers: () => fetchJson<import('../types').UserDto[]>('/users'),

  createUser: (data: { username: string; password: string; role: string }) =>
    fetchJson<{ success: boolean; message?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  deleteUser: (id: string) =>
    fetchJson<{ success: boolean; message?: string }>(`/users/${id}`, {
      method: 'DELETE'
    }),

  logout: async () => {
    const res = await fetchJson<{ success: boolean; message?: string }>('/auth/logout', {
      method: 'POST'
    });
    invalidateCache();
    return res;
  }
};
