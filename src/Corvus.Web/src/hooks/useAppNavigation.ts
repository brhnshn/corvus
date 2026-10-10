import { useState, useEffect, useCallback } from 'react';
import type { PageId } from '../components/Sidebar';

export const VALID_PAGES: PageId[] = [
  'dashboard', 
  'services', 
  'containers', 
  'metrics', 
  'uptime', 
  'activity', 
  'settings', 
  'profile'
];

export interface ParsedRoute {
  page: PageId;
  containerId: string | null;
  action?: string | null;
}

export const parseCurrentRoute = (): ParsedRoute => {
  const path = window.location.pathname.replace(/^\//, '');
  const searchParams = new URLSearchParams(window.location.search);
  const actionParam = searchParams.get('action');
  const segments = path.split('/');
  const first = segments[0]?.toLowerCase() as PageId;
  if (first === 'containers' && segments[1]) {
    return { page: 'containers', containerId: segments[1], action: actionParam };
  }
  if (VALID_PAGES.includes(first)) {
    return { page: first, containerId: null, action: actionParam };
  }
  return { page: 'dashboard', containerId: null, action: actionParam };
};

export function useAppNavigation() {
  const [currentRoute, setCurrentRoute] = useState<ParsedRoute>(parseCurrentRoute);

  const navigateTo = useCallback((page: PageId, containerId?: string | null, tab?: string | null) => {
    const isAction = !containerId && tab;
    const newRoute: ParsedRoute = { 
      page, 
      containerId: containerId || null,
      action: isAction ? tab : null
    };
    setCurrentRoute(newRoute);
    let newPath = page === 'dashboard' ? '/' : `/${page}`;
    if (page === 'containers' && containerId) {
      newPath = `/containers/${containerId}${tab ? `?tab=${tab}` : ''}`;
    } else if (page === 'containers' && isAction) {
      newPath = `/containers?action=${tab}`;
    }
    const currentFull = window.location.pathname + window.location.search;
    if (currentFull !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    currentRoute,
    currentPage: currentRoute.page,
    selectedContainerId: currentRoute.containerId,
    initialAction: currentRoute.action,
    navigateTo,
  };
}
