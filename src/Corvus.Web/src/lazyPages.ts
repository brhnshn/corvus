import { lazyWithRetry } from './utils/lazyWithRetry';

// Code-splitting via lazyWithRetry for bundle optimization (Roadmap 3.1)
export const DashboardPage = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.DashboardPage })));
export const ServicesPage = lazyWithRetry(() => import('./pages/Services').then(m => ({ default: m.ServicesPage })));
export const ContainersPage = lazyWithRetry(() => import('./pages/Containers').then(m => ({ default: m.ContainersPage })));
export const DeploymentsPage = lazyWithRetry(() => import('./pages/Deployments').then(m => ({ default: m.DeploymentsPage })));
export const SystemsPage = lazyWithRetry(() => import('./pages/Systems').then(m => ({ default: m.SystemsPage })));
export const SystemMetricsPage = lazyWithRetry(() => import('./pages/SystemMetrics').then(m => ({ default: m.SystemMetricsPage })));
export const UptimePage = lazyWithRetry(() => import('./pages/Uptime').then(m => ({ default: m.UptimePage })));
export const SettingsPage = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));
export const ProfilePage = lazyWithRetry(() => import('./pages/Profile').then(m => ({ default: m.ProfilePage })));
export const ContainerDetailPage = lazyWithRetry(() => import('./pages/ContainerDetail').then(m => ({ default: m.ContainerDetailPage })));
export const ActivityTimelinePage = lazyWithRetry(() => import('./pages/ActivityTimeline').then(m => ({ default: m.ActivityTimelinePage })));
export const AuthPage = lazyWithRetry(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
export const PublicStatus = lazyWithRetry(() => import('./pages/PublicStatus'));
