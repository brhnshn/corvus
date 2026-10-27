import { getActiveSystemId } from '../hooks/activeSystemStore';

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const activeSystemId = getActiveSystemId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(activeSystemId ? { 'X-System-Id': activeSystemId } : {}),
    ...((options?.headers as Record<string, string>) || {})
  };

  const res = await fetch(`${API_BASE}${url}`, {
    credentials: options?.credentials ?? 'include',
    ...options,
    headers
  });

  if (!res.ok) {
    if (res.status === 401 && !url.includes('/auth/')) {
      window.dispatchEvent(new CustomEvent('corvus_unauthorized'));
    }

    let errMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errBody: unknown = await res.json();
      if (errBody && typeof errBody === 'object') {
        const bodyObj = errBody as Record<string, unknown>;
        if (typeof bodyObj.message === 'string') {
          errMsg = bodyObj.message;
        } else if (typeof bodyObj.detail === 'string') {
          errMsg = bodyObj.detail;
        } else if (typeof bodyObj.title === 'string') {
          errMsg = bodyObj.title;
        } else if (bodyObj.error) {
          errMsg = typeof bodyObj.error === 'string' ? bodyObj.error : JSON.stringify(bodyObj.error);
        }
      }
    } catch {
      // fallback to status text
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<T>;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const apiCache = new Map<string, CacheEntry<unknown>>();

function getCacheKey(url: string): string {
  const activeSystemId = getActiveSystemId() || 'default';
  return `${activeSystemId}:${url}`;
}

export function invalidateCache(urlPattern?: string): void {
  if (!urlPattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(urlPattern)) {
      apiCache.delete(key);
    }
  }
}

export async function fetchCachedJson<T>(url: string, options?: RequestInit, ttlMs = 30000): Promise<T> {
  if (options && options.method && options.method.toUpperCase() !== 'GET') {
    return fetchJson<T>(url, options);
  }

  const cacheKey = getCacheKey(url);
  const now = Date.now();
  const cached = apiCache.get(cacheKey) as CacheEntry<T> | undefined;

  // Cache geçerliyse doğrudan döndür
  if (cached && (now - cached.timestamp < cached.ttl)) {
    return cached.data;
  }

  // Stale veri varsa: hemen eski veriyi döndür, arka planda yenile
  if (cached) {
    fetchJson<T>(url, options)
      .then(freshData => {
        apiCache.set(cacheKey, { data: freshData, timestamp: Date.now(), ttl: ttlMs });
      })
      .catch(() => {
        // Arka plan fetch başarısız olursa mevcut cache'i koru (TTL uzat)
        apiCache.set(cacheKey, { data: cached.data, timestamp: Date.now(), ttl: ttlMs });
      });
    return cached.data;
  }

  // İlk kez yükleme: gerçekten bekle
  const data = await fetchJson<T>(url, options);
  apiCache.set(cacheKey, { data, timestamp: now, ttl: ttlMs });
  return data;
}
