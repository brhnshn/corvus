import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveSystem } from '../hooks/useActiveSystem';
import {
  setActiveSystem,
  ACTIVE_SYSTEM_ID_KEY,
  ACTIVE_SYSTEM_NAME_KEY,
  ACTIVE_SYSTEM_CHANGED_EVENT,
  DEFAULT_SYSTEM_ID,
  DEFAULT_SYSTEM_NAME,
} from '../hooks/activeSystemStore';
import * as httpModule from '../api/http';

vi.mock('../api/http', () => ({
  invalidateCache: vi.fn(),
  fetchJson: vi.fn(),
  fetchCachedJson: vi.fn(),
}));

describe('useActiveSystem & activeSystemStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // 1. Boş storage'da { 'local-host', 'Host' } döner.
  it('returns default values when storage is empty', () => {
    const { result } = renderHook(() => useActiveSystem());
    expect(result.current.systemId).toBe(DEFAULT_SYSTEM_ID);
    expect(result.current.systemName).toBe(DEFAULT_SYSTEM_NAME);
  });

  // 2. Storage'daki değeri okur.
  it('reads initial values from localStorage', () => {
    localStorage.setItem(ACTIVE_SYSTEM_ID_KEY, 'server-alpha');
    localStorage.setItem(ACTIVE_SYSTEM_NAME_KEY, 'Server Alpha');

    const { result } = renderHook(() => useActiveSystem());
    expect(result.current.systemId).toBe('server-alpha');
    expect(result.current.systemName).toBe('Server Alpha');
  });

  // 3. setActiveSystem('n1','Node 1') iki anahtarı yazar, event'i bir kez yayar, hook state'i güncellenir, invalidateCache çağrılır.
  it('writes keys, dispatches event once, updates hook state, and calls invalidateCache on setActiveSystem', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useActiveSystem());

    act(() => {
      setActiveSystem('n1', 'Node 1');
    });

    expect(localStorage.getItem(ACTIVE_SYSTEM_ID_KEY)).toBe('n1');
    expect(localStorage.getItem(ACTIVE_SYSTEM_NAME_KEY)).toBe('Node 1');
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(httpModule.invalidateCache).toHaveBeenCalledTimes(1);
    expect(result.current.systemId).toBe('n1');
    expect(result.current.systemName).toBe('Node 1');

    dispatchSpy.mockRestore();
  });

  // 4. Aynı anda render edilmiş iki hook, tek setActiveSystem'den sonra ikisi de güncellenir.
  it('synchronizes multiple hook instances simultaneously', () => {
    const { result: hook1 } = renderHook(() => useActiveSystem());
    const { result: hook2 } = renderHook(() => useActiveSystem());

    expect(hook1.current.systemId).toBe(DEFAULT_SYSTEM_ID);
    expect(hook2.current.systemId).toBe(DEFAULT_SYSTEM_ID);

    act(() => {
      hook1.current.setActiveSystem('node-cluster', 'Cluster Primary');
    });

    expect(hook1.current.systemId).toBe('node-cluster');
    expect(hook1.current.systemName).toBe('Cluster Primary');
    expect(hook2.current.systemId).toBe('node-cluster');
    expect(hook2.current.systemName).toBe('Cluster Primary');
  });

  // 5. Dışarıdan window.dispatchEvent(new CustomEvent(..., { detail })) state'i günceller.
  it('updates state when custom event with detail is dispatched externally', () => {
    const { result } = renderHook(() => useActiveSystem());

    act(() => {
      window.dispatchEvent(
        new CustomEvent(ACTIVE_SYSTEM_CHANGED_EVENT, {
          detail: { systemId: 'node-ext', systemName: 'External Node' },
        })
      );
    });

    expect(result.current.systemId).toBe('node-ext');
    expect(result.current.systemName).toBe('External Node');
  });

  // 6. detail'sız event storage'a düşer.
  it('falls back to storage when event has no detail', () => {
    const { result } = renderHook(() => useActiveSystem());

    localStorage.setItem(ACTIVE_SYSTEM_ID_KEY, 'node-storage-only');
    localStorage.setItem(ACTIVE_SYSTEM_NAME_KEY, 'Storage Node');

    act(() => {
      window.dispatchEvent(new CustomEvent(ACTIVE_SYSTEM_CHANGED_EVENT));
    });

    expect(result.current.systemId).toBe('node-storage-only');
    expect(result.current.systemName).toBe('Storage Node');
  });

  // 7. İsimsiz çağrıda local-host için 'Host', diğer id'ler için id'nin kendisi kullanılır.
  it('resolves default names when name is omitted', () => {
    act(() => {
      setActiveSystem('local-host');
    });
    expect(localStorage.getItem(ACTIVE_SYSTEM_ID_KEY)).toBe('local-host');
    expect(localStorage.getItem(ACTIVE_SYSTEM_NAME_KEY)).toBe('Host');

    act(() => {
      setActiveSystem('remote-server-42');
    });
    expect(localStorage.getItem(ACTIVE_SYSTEM_ID_KEY)).toBe('remote-server-42');
    expect(localStorage.getItem(ACTIVE_SYSTEM_NAME_KEY)).toBe('remote-server-42');
  });

  // 8. Unmount'ta listener kaldırılır (vi.spyOn(window, 'removeEventListener')).
  it('removes event listener on unmount', () => {
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useActiveSystem());

    unmount();

    expect(removeListenerSpy).toHaveBeenCalledWith(
      ACTIVE_SYSTEM_CHANGED_EVENT,
      expect.any(Function)
    );
    removeListenerSpy.mockRestore();
  });
});
