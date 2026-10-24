import { useEffect, useState } from 'react';
import { systemsApi } from '../api/systems';
import type { SystemStatus } from '../types/systems';

const POLL_INTERVAL_MS = 30000;

const readActiveSystemId = (): string =>
  (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_id') : null) || 'local-host';

/**
 * Seçili düğümün canlı bağlantı durumunu döner (online/offline/...).
 * Durum henüz bilinmiyorsa null döner; arayüz bu durumda nötr gösterim yapmalı.
 */
export function useActiveSystemStatus(): SystemStatus | null {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const systems = await systemsApi.getSystems();
        if (cancelled) return;
        const activeId = readActiveSystemId();
        setStatus(systems.find((s) => s.id === activeId)?.status ?? null);
      } catch {
        // Durum okunamazsa önceki değeri koru; ana arayüz bundan etkilenmez
      }
    };

    load();
    const interval = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_INTERVAL_MS);

    const handleSystemChange = () => {
      setStatus(null);
      load();
    };
    window.addEventListener('corvus_active_system_changed', handleSystemChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('corvus_active_system_changed', handleSystemChange);
    };
  }, []);

  return status;
}

/** Düğüm durumunu StatusDot değerine çevirir. */
export const systemStatusToDot = (status: SystemStatus | null): 'up' | 'warn' | 'down' | 'muted' => {
  if (status === 'online') return 'up';
  if (status === 'degraded') return 'warn';
  if (status === 'offline') return 'down';
  return 'muted';
};
