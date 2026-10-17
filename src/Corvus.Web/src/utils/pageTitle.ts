import type { PageId } from '../components/Sidebar';
import type { TranslationKey } from '../i18n/types';

export interface PageTitleOptions {
  selectedContainerId?: string | null;
}

export type TranslatorFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

/**
 * Returns the localized human-readable page title for Header and document.title.
 * Single source of truth across App.tsx, Header.tsx, and tests.
 */
export function getPageTitle(
  page: PageId | string,
  t: TranslatorFn,
  options?: PageTitleOptions
): string {
  if (page === 'containers' && options?.selectedContainerId) {
    const detailTitle = t('containers.detailTitle');
    return detailTitle && detailTitle !== 'containers.detailTitle'
      ? detailTitle
      : t('nav.containers') || 'Containers';
  }

  switch (page) {
    case 'dashboard':
      return t('nav.dashboard') || 'Dashboard';
    case 'services':
      return t('nav.services') || 'Services';
    case 'containers':
      return t('nav.containers') || 'Containers';
    case 'deployments':
      return t('deployments.title') || t('nav.deployments') || 'Deployments';
    case 'systems':
      return t('nav.systems') || 'Systems';
    case 'metrics':
      return t('nav.metrics') || 'System Metrics';
    case 'uptime':
      return t('nav.uptime') || 'Uptime';
    case 'activity':
      return t('nav.activity') || 'Activity';
    case 'settings':
      return t('nav.settings') || 'Settings';
    case 'profile':
      return t('nav.profile') || 'Profile';
    default:
      return '';
  }
}

/**
 * Formats the browser tab title (document.title), e.g. "Dağıtım Merkezi - Corvus".
 * Guaranteed to never return "undefined - Corvus", "Corvus - Corvus", or empty title.
 */
export function formatDocumentTitle(title?: string | null): string {
  const brand = 'Corvus';
  if (!title || typeof title !== 'string') {
    return brand;
  }

  const trimmed = title.trim();
  if (!trimmed || trimmed === brand || trimmed.toLowerCase() === 'undefined') {
    return brand;
  }

  return `${trimmed} - ${brand}`;
}
