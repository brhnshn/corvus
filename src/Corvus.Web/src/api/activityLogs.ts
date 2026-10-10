import { fetchJson } from './http';
import type { ActivityLogPagedResult } from '../types';

export const activityLogsApi = {
  getActivityLogs: (page = 1, limit = 50, category?: string, search?: string) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (category && category !== 'all') params.set('category', category);
    if (search && search.trim()) params.set('search', search.trim());

    return fetchJson<ActivityLogPagedResult>(`/activity-logs?${params.toString()}`);
  },
};
