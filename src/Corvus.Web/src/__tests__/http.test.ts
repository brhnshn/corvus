import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchJson, fetchCachedJson, invalidateCache } from '../api/http';

describe('HTTP Client (fetchJson & caching)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    invalidateCache();
  });

  it('fetches JSON successfully with proper headers', async () => {
    const mockData = { id: 1, name: 'corvus' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as unknown as Response);

    const data = await fetchJson<typeof mockData>('/test');
    expect(data).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
    }));
  });

  it('falls back to the default system id in X-System-Id when none is stored', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) } as unknown as Response);
    await fetchJson('/test');
    expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({ 'X-System-Id': 'local-host' }),
    }));
  });

  it('attaches X-System-Id header if set in localStorage', async () => {
    localStorage.setItem('corvus_active_system_id', 'node-99');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as unknown as Response);

    await fetchJson('/systems');
    expect(global.fetch).toHaveBeenCalledWith('/api/systems', expect.objectContaining({
      headers: expect.objectContaining({
        'X-System-Id': 'node-99',
      }),
    }));
  });

  it('throws error with server message on non-ok status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Geçersiz parametre' }),
    } as unknown as Response);

    await expect(fetchJson('/bad')).rejects.toThrow('Geçersiz parametre');
  });

  it('caches GET response with fetchCachedJson and allows invalidation', async () => {
    const responseData = { count: 42 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseData,
    } as unknown as Response);

    const first = await fetchCachedJson('/cached-data', undefined, 10000);
    const second = await fetchCachedJson('/cached-data', undefined, 10000);

    expect(first).toEqual(responseData);
    expect(second).toEqual(responseData);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Invalidate
    invalidateCache('/cached-data');
    await fetchCachedJson('/cached-data', undefined, 10000);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
