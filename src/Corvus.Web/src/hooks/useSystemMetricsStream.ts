import { useEffect, useState, useRef, useCallback } from 'react';
import type { SystemTelemetryStreamDto, SystemMetric } from '../types';
import { api } from '../api/client';

export interface UseSystemMetricsStreamResult {
  livePoint: SystemTelemetryStreamDto | null;
  latestMetric: SystemMetric | null;
  isConnected: boolean;
  isFallbackPolling: boolean;
  error: string | null;
  reconnect: () => void;
}

export function telemetryPointToSystemMetric(point: SystemTelemetryStreamDto): SystemMetric {
  return {
    id: point.timestampUnixSeconds,
    recordedAt: new Date(point.timestampUnixSeconds * 1000).toISOString(),
    cpuPercent: Math.round(point.cpuPercent * 10) / 10,
    ramUsedMb: Math.round(point.ramUsedBytes / (1024 * 1024)),
    ramTotalMb: Math.round(point.ramTotalBytes / (1024 * 1024)),
    diskUsedGb: +(point.diskUsedBytes / (1024 * 1024 * 1024)).toFixed(1),
    diskTotalGb: +(point.diskTotalBytes / (1024 * 1024 * 1024)).toFixed(1),
    networkRxBytes: point.netRxBytesSec,
    networkTxBytes: point.netTxBytesSec,
  };
}

/**
 * Server-Sent Events (SSE) ile anlık (100ms sync) telemetri akışını dinleyen hook.
 * EventSource desteklenmediğinde veya bağlantı arka arkaya koptuğunda otomatik
 * olarak HTTP polling fallback moduna geçer.
 */
export function useSystemMetricsStream(targetSystemId?: string): UseSystemMetricsStreamResult {
  const [livePoint, setLivePoint] = useState<SystemTelemetryStreamDto | null>(null);
  const [latestMetric, setLatestMetric] = useState<SystemMetric | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isFallbackPolling, setIsFallbackPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const failureCountRef = useRef(0);
  const isMountedRef = useRef(true);

  // Aktif sistem kimliğini belirle
  const resolvedSystemId = targetSystemId || (typeof window !== 'undefined' ? localStorage.getItem('corvus_active_system_id') : null) || 'local-host';

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const startFallbackPolling = useCallback(() => {
    clearTimers();
    closeEventSource();
    if (!isMountedRef.current) return;

    setIsConnected(false);
    setIsFallbackPolling(true);

    const poll = async () => {
      try {
        const metric = await api.getLatestMetrics();
        if (!isMountedRef.current) return;
        setLatestMetric(metric);
        setError(null);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err.message : 'Polling telemetri alınamadı');
      }
    };

    poll();
    pollingIntervalRef.current = setInterval(poll, 5000);
  }, [clearTimers, closeEventSource]);

  const connectSSE = useCallback(() => {
    clearTimers();
    closeEventSource();

    if (typeof window === 'undefined' || !('EventSource' in window)) {
      startFallbackPolling();
      return;
    }

    const streamUrl = resolvedSystemId === 'local-host'
      ? '/api/metrics/stream'
      : `/api/v1/systems/${encodeURIComponent(resolvedSystemId)}/stream`;

    try {
      const es = new EventSource(streamUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setIsFallbackPolling(false);
        setError(null);
        failureCountRef.current = 0;
      };

      const handleTelemetryMessage = (e: MessageEvent) => {
        if (!isMountedRef.current || !e.data) return;
        try {
          const point: SystemTelemetryStreamDto = JSON.parse(e.data);
          setLivePoint(point);
          setLatestMetric(telemetryPointToSystemMetric(point));
          setIsConnected(true);
          setError(null);
        } catch (parseErr) {
          console.error('SSE telemetri JSON ayrıştırma hatası:', parseErr);
        }
      };

      es.addEventListener('telemetry', handleTelemetryMessage);
      es.onmessage = handleTelemetryMessage;

      es.onerror = () => {
        if (!isMountedRef.current) return;
        setIsConnected(false);
        closeEventSource();

        failureCountRef.current += 1;
        if (failureCountRef.current >= 4) {
          // 4 başarısız denemeden sonra HTTP polling moduna geç
          startFallbackPolling();
          return;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(1000 * Math.pow(2, failureCountRef.current - 1), 16000);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            connectSSE();
          }
        }, delay);
      };
    } catch {
      startFallbackPolling();
    }
  }, [clearTimers, closeEventSource, resolvedSystemId, startFallbackPolling]);

  useEffect(() => {
    isMountedRef.current = true;
    failureCountRef.current = 0;
    connectSSE();

    const handleSystemChange = () => {
      failureCountRef.current = 0;
      connectSSE();
    };

    window.addEventListener('corvus_active_system_changed', handleSystemChange);

    return () => {
      isMountedRef.current = false;
      clearTimers();
      closeEventSource();
      window.removeEventListener('corvus_active_system_changed', handleSystemChange);
    };
  }, [connectSSE, clearTimers, closeEventSource]);

  return {
    livePoint,
    latestMetric,
    isConnected,
    isFallbackPolling,
    error,
    reconnect: connectSSE,
  };
}
