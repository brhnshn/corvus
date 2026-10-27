import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveSystemId, setActiveSystem, DEFAULT_SYSTEM_ID } from '../hooks/activeSystemStore';

vi.mock('../api/http', () => ({ invalidateCache: vi.fn() }));

describe('getActiveSystemId', () => {
  beforeEach(() => localStorage.clear());

  it('returns the default id when nothing is stored', () => {
    expect(getActiveSystemId()).toBe(DEFAULT_SYSTEM_ID);
  });

  it('returns the stored id synchronously after setActiveSystem', () => {
    setActiveSystem('node-7', 'Node 7');
    expect(getActiveSystemId()).toBe('node-7');
  });
});
