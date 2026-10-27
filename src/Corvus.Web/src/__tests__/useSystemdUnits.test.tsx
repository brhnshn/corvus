import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSystemdUnits } from '../pages/Services/useSystemdUnits';
import { ACTIVE_SYSTEM_ID_KEY, getActiveSystemId, setActiveSystem } from '../hooks/activeSystemStore';
import { systemdApi } from '../api/systemd';

vi.mock('../api/http', () => ({
  invalidateCache: vi.fn(),
  fetchJson: vi.fn(),
  fetchCachedJson: vi.fn(),
}));

vi.mock('../api/systemd', () => ({
  systemdApi: {
    getUnits: vi.fn().mockResolvedValue([]),
    getLogs: vi.fn(),
    controlUnit: vi.fn(),
  },
}));

vi.mock('../api/systems', () => ({
  systemsApi: {
    getSystems: vi.fn().mockResolvedValue([{ id: 'node-1', name: 'Node One' }]),
  },
}));

vi.mock('../i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }));
vi.mock('../components/ui/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

describe('useSystemdUnits active system', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('maps the default store system (local-host) to the systemd local id', async () => {
    const { result } = renderHook(() => useSystemdUnits({ isAdmin: true }));
    expect(result.current.activeSystemId).toBe('local');
    await waitFor(() => expect(systemdApi.getUnits).toHaveBeenCalledWith('local'));
  });

  it('follows the central store when the active system changes', async () => {
    const { result } = renderHook(() => useSystemdUnits({ isAdmin: true }));
    act(() => setActiveSystem('node-1', 'Node One'));
    await waitFor(() => expect(result.current.activeSystemId).toBe('node-1'));
    await waitFor(() => expect(systemdApi.getUnits).toHaveBeenCalledWith('node-1'));
  });

  it('writes selection back to the store and maps local to local-host', async () => {
    const { result } = renderHook(() => useSystemdUnits({ isAdmin: true }));
    await waitFor(() => expect(result.current.systems.length).toBe(1));

    act(() => result.current.setActiveSystemId('node-1'));
    expect(localStorage.getItem(ACTIVE_SYSTEM_ID_KEY)).toBe('node-1');

    act(() => result.current.setActiveSystemId('local'));
    expect(getActiveSystemId()).toBe('local-host');
  });
});
