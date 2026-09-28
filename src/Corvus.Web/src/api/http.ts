const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: options?.credentials ?? 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    }
  });

  if (!res.ok) {
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

  const now = Date.now();
  const cached = apiCache.get(url) as CacheEntry<T> | undefined;

  // Cache geçerliyse doğrudan döndür
  if (cached && (now - cached.timestamp < cached.ttl)) {
    return cached.data;
  }

  // Stale veri varsa: hemen eski veriyi döndür, arka planda yenile
  if (cached) {
    fetchJson<T>(url, options)
      .then(freshData => {
        apiCache.set(url, { data: freshData, timestamp: Date.now(), ttl: ttlMs });
      })
      .catch(() => {
        // Arka plan fetch başarısız olursa mevcut cache'i koru (TTL uzat)
        apiCache.set(url, { data: cached.data, timestamp: Date.now(), ttl: ttlMs });
      });
    return cached.data;
  }

  // İlk kez yükleme: gerçekten bekle
  const data = await fetchJson<T>(url, options);
  apiCache.set(url, { data, timestamp: now, ttl: ttlMs });
  return data;
}
