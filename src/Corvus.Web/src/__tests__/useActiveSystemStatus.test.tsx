import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActiveSystemStatus, systemStatusToDot } from '../hooks/useActiveSystemStatus';
import { systemsApi } from '../api/systems';
import {
  ACTIVE_SYSTEM_ID_KEY,
  ACTIVE_SYSTEM_NAME_KEY,
  DEFAULT_SYSTEM_ID,
  DEFAULT_SYSTEM_NAME,
} from '../hooks/activeSystemStore';

vi.mock('../api/systems', () => ({
  systemsApi: {
    getSystems: vi.fn(),
  },
}));

vi.mock('../api/http', () => ({
  invalidateCache: vi.fn(),
  fetchJson: vi.fn(),
  fetchCachedJson: vi.fn(),
}));

describe('useActiveSystemStatus (B3 fallback for deleted system)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('resets to DEFAULT_SYSTEM_ID and DEFAULT_SYSTEM_NAME when active node is not in fetched systems', async () => {
    localStorage.setItem(ACTIVE_SYSTEM_ID_KEY, 'deleted-node-123');
    localStorage.setItem(ACTIVE_SYSTEM_NAME_KEY, 'Deleted Node');

    vi.mocked(systemsApi.getSystems).mockResolvedValue([
      { id: 'local-host', name: 'Host', status: 'online' } as any,
      { id: 'other-node', name: 'Other Node', status: 'online' } as any,
    ]);

    renderHook(() => useActiveSystemStatus());

    await waitFor(() => {
      expect(localStorage.getItem(ACTIVE_SYSTEM_ID_KEY)).toBe(DEFAULT_SYSTEM_ID);
      expect(localStorage.getItem(ACTIVE_SYSTEM_NAME_KEY)).toBe(DEFAULT_SYSTEM_NAME);
    });
  });

  it('does NOT reset storage when systemsApi.getSystems rejects with a network error', async () => {
    localStorage.setItem(ACTIVE_SYSTEM_ID_KEY, 'custom-node');
    localStorage.setItem(ACTIVE_SYSTEM_NAME_KEY, 'Custom Node');

    vi.mocked(systemsApi.getSystems).mockRejectedValue(new Error('Network error'));

    renderHook(() => useActiveSystemStatus());

    // Wait a tick to ensure error handling executed
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(localStorage.getItem(ACTIVE_SYSTEM_ID_KEY)).toBe('custom-node');
    expect(localStorage.getItem(ACTIVE_SYSTEM_NAME_KEY)).toBe('Custom Node');
  });

  it('does not loop when storage is not writable during reset', async () => {
    localStorage.setItem(ACTIVE_SYSTEM_ID_KEY, 'deleted-node-123');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    vi.mocked(systemsApi.getSystems).mockResolvedValue([
      { id: 'local-host', name: 'Host', status: 'online' } as any,
    ]);

    renderHook(() => useActiveSystemStatus());

    await new Promise((resolve) => setTimeout(resolve, 50));

    // İlk yükleme + sıfırlama olayının tetiklediği tek yeniden yükleme
    expect(vi.mocked(systemsApi.getSystems).mock.calls.length).toBeLessThanOrEqual(2);
    setItemSpy.mockRestore();
  });

  it('returns correct systemStatusToDot values', () => {
    expect(systemStatusToDot('online')).toBe('up');
    expect(systemStatusToDot('degraded')).toBe('warn');
    expect(systemStatusToDot('offline')).toBe('down');
    expect(systemStatusToDot('paused')).toBe('muted');
    expect(systemStatusToDot(null)).toBe('muted');
  });
});
