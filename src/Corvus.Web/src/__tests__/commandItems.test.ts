import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCommandItems } from '../components/common/CommandPalette/commandItems';
import { api } from '../api';
import {
  ACTIVE_SYSTEM_ID_KEY,
  ACTIVE_SYSTEM_NAME_KEY,
  ACTIVE_SYSTEM_CHANGED_EVENT,
} from '../hooks/activeSystemStore';

vi.mock('../api', () => ({
  api: {
    getContainers: vi.fn().mockResolvedValue([]),
    getSystems: vi.fn(),
    getServices: vi.fn().mockResolvedValue([]),
  },
  invalidateCache: vi.fn(),
}));

describe('CommandPalette commandItems (B2 switch command)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('switches node using setActiveSystem, navigates to dashboard, and dispatches corvus_active_system_changed', async () => {
    vi.mocked(api.getSystems).mockResolvedValue([
      {
        id: 'node-remote-1',
        name: 'Worker Alpha',
        ipAddress: '192.168.1.50',
        hostname: 'worker-alpha',
        status: 'online',
        cpuUsage: 10,
        ramUsage: 20,
        diskUsage: 30,
        loadAverage: [0.1, 0.2, 0.3],
        updatedAt: new Date().toISOString(),
      } as any,
    ]);

    const onNavigate = vi.fn();
    const toast = {
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    const t = vi.fn((key: string, params?: any) => `${key}:${params?.name || ''}`);
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const items = await fetchCommandItems({
      t,
      onNavigate,
      toast,
    });

    const switchItem = items.find((item) => item.id === 'cmd-switch-node-remote-1');
    expect(switchItem).toBeDefined();

    switchItem?.onSelect();

    expect(localStorage.getItem(ACTIVE_SYSTEM_ID_KEY)).toBe('node-remote-1');
    expect(localStorage.getItem(ACTIVE_SYSTEM_NAME_KEY)).toBe('Worker Alpha');
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
    expect(toast.success).toHaveBeenCalledWith('commandPalette.switchedToSystem:Worker Alpha');

    const eventCalls = dispatchSpy.mock.calls.filter(
      ([event]) => event.type === ACTIVE_SYSTEM_CHANGED_EVENT
    );
    expect(eventCalls.length).toBe(1);
    expect((eventCalls[0][0] as CustomEvent).detail).toEqual({
      systemId: 'node-remote-1',
      systemName: 'Worker Alpha',
    });

    dispatchSpy.mockRestore();
  });
});
