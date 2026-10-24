import { useEffect } from 'react';
import { invalidateCache } from '../api/client';

export interface UseEventStreamProps {
  isStatusPath: boolean;
  authLoading: boolean;
  authEnabled?: boolean;
  isAuthenticated?: boolean;
}

// Server-Sent Events (SSE) — Canlı Veri Yayını Bağlantısı (Yüksek Dayanıklılık Mimarisi)
// Ağ kopsa bile asla pes etmez; backoff ile dener, internet geri geldiğinde veya
export function useEventStream({
  isStatusPath,
  authLoading,
  authEnabled,
  isAuthenticated,
}: UseEventStreamProps) {
  useEffect(() => {
    if (isStatusPath) return;
    if (authLoading) return;
    if (authEnabled && !isAuthenticated) return;

    let eventSource: EventSource | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      try {
        eventSource = new EventSource('/api/stream/events');

        eventSource.onopen = () => {
          retryCount = 0; // Bağlantı başarılıysa sayacı sıfırla
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('corvus_event', { detail: parsed }));
            const eventType: string | undefined = parsed.eventType || parsed.type;
            if (eventType?.includes('container')) {
              invalidateCache('/containers');
              invalidateCache('/dashboard');
              const containerId = parsed.containerId || parsed.id || parsed.ContainerId;
              if (containerId) {
                invalidateCache(`/containers/${containerId}/inspect`);
              }
            } else if (eventType?.includes('service')) {
              invalidateCache('/services');
              invalidateCache('/dashboard');
            } else if (eventType?.includes('push') || eventType?.includes('snitch')) {
              invalidateCache('/push-monitors');
              invalidateCache('/dashboard');
            }
          } catch {
            // keepalive/ping mesajları JSON olmayabilir
          }
        };

        eventSource.onerror = () => {
          if (isDisposed) return;
          eventSource?.close();
          eventSource = null;

          // Üstel geri çekilme (exponential backoff): 1s, 2s, 4s, 8s, 16s ... max 20s aralıkla yeniden bağlan
          const delay = Math.min(1000 * 2 ** Math.min(retryCount, 4), 20000);
          retryCount++;
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(connect, delay);
        };
      } catch (e) {
        console.warn('[SSE] EventSource oluşturulamadı:', e);
      }
    };

    const handleOnline = () => {
      if (isDisposed) return;
      if (retryTimer) clearTimeout(retryTimer);
      retryCount = 0;
      invalidateCache(); // İnternet geri geldiğinde bayat önbelleği temizle
      connect();
    };

    const handleVisibility = () => {
      if (isDisposed) return;
      if (document.visibilityState === 'visible') {
        // Sekme tekrar öne geldiğinde bağlantı kopuksa hemen canlandır
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          if (retryTimer) clearTimeout(retryTimer);
          retryCount = 0;
          invalidateCache();
          connect();
        }
      }
    };

    connect();
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isDisposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      eventSource?.close();
    };
  }, [isStatusPath, authLoading, isAuthenticated, authEnabled]);
}
