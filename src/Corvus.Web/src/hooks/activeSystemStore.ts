import { invalidateCache } from '../api/http';

export const ACTIVE_SYSTEM_ID_KEY = 'corvus_active_system_id';
export const ACTIVE_SYSTEM_NAME_KEY = 'corvus_active_system_name';
export const ACTIVE_SYSTEM_CHANGED_EVENT = 'corvus_active_system_changed';
export const DEFAULT_SYSTEM_ID = 'local-host';
export const DEFAULT_SYSTEM_NAME = 'Host';

export interface ActiveSystem {
  id: string;
  name: string;
}

export function readActiveSystem(): ActiveSystem {
  if (typeof window === 'undefined') {
    return { id: DEFAULT_SYSTEM_ID, name: DEFAULT_SYSTEM_NAME };
  }
  try {
    const id = localStorage.getItem(ACTIVE_SYSTEM_ID_KEY) || DEFAULT_SYSTEM_ID;
    const name = localStorage.getItem(ACTIVE_SYSTEM_NAME_KEY) || DEFAULT_SYSTEM_NAME;
    return { id, name };
  } catch {
    return { id: DEFAULT_SYSTEM_ID, name: DEFAULT_SYSTEM_NAME };
  }
}

export function setActiveSystem(id: string, name?: string): void {
  const resolvedName = (name && name.trim()) ? name : (id === DEFAULT_SYSTEM_ID ? DEFAULT_SYSTEM_NAME : id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ACTIVE_SYSTEM_ID_KEY, id);
      localStorage.setItem(ACTIVE_SYSTEM_NAME_KEY, resolvedName);
    } catch {
      // storage quota or permission error fallback
    }
  }
  invalidateCache();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ACTIVE_SYSTEM_CHANGED_EVENT, {
        detail: { systemId: id, systemName: resolvedName },
      })
    );
  }
}
