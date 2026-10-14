import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '../utils/fuzzySearch';

describe('fuzzyMatch utility', () => {
  it('returns true when pattern is empty', () => {
    expect(fuzzyMatch('', 'nginx').match).toBe(true);
  });

  it('matches exact and substring terms with high score', () => {
    const res = fuzzyMatch('nginx', 'nginx proxy manager');
    expect(res.match).toBe(true);
    expect(res.score).toBeGreaterThan(90);
  });

  it('matches scattered letters in sequence', () => {
    const res = fuzzyMatch('npm', 'nginx proxy manager');
    expect(res.match).toBe(true);
  });

  it('rejects letters out of order or missing', () => {
    const res = fuzzyMatch('xyz', 'nginx proxy manager');
    expect(res.match).toBe(false);
  });

  it('is case insensitive', () => {
    const res = fuzzyMatch('POSTGRES', 'postgresql database');
    expect(res.match).toBe(true);
  });
});
