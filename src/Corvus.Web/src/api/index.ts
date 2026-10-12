import { authApi } from './auth';
import { servicesApi } from './services';
import { containersApi } from './containers';
import { uptimeApi } from './uptime';
import { metricsApi } from './metrics';
import { settingsApi } from './settings';
import { incidentsApi } from './incidents';
import { alertsApi } from './alerts';
import { activityLogsApi } from './activityLogs';
import { systemsApi } from './systems';

export const api = {
  ...authApi,
  ...servicesApi,
  ...containersApi,
  ...uptimeApi,
  ...metricsApi,
  ...settingsApi,
  ...incidentsApi,
  ...alertsApi,
  ...activityLogsApi,
  ...systemsApi
};

export { fetchJson, fetchCachedJson, invalidateCache } from './http';
export { authApi } from './auth';
export { servicesApi } from './services';
export { containersApi } from './containers';
export { uptimeApi } from './uptime';
export { metricsApi } from './metrics';
export { settingsApi } from './settings';
export { incidentsApi } from './incidents';
export { alertsApi } from './alerts';
export { activityLogsApi } from './activityLogs';
export { systemsApi } from './systems';
export * from '../types';
