import { describe, it, expect } from 'vitest';
import { formatBytes, formatRelativeTime } from '../utils/format';

describe('formatBytes', () => {
  it('formats zero or negative bytes as 0 B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(-100)).toBe('0 B');
  });

  it('formats bytes into KB, MB, GB properly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
    expect(formatBytes(5368709120)).toBe('5 GB');
  });

  it('formats non-exact byte amounts with single decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2621440)).toBe('2.5 MB');
  });
});

describe('formatRelativeTime', () => {
  it('returns Bilinmiyor/Unknown when input is null or undefined', () => {
    expect(formatRelativeTime(null, true)).toBe('Bilinmiyor');
    expect(formatRelativeTime(null, false)).toBe('Unknown');
  });

  it('formats recent timestamps as Az önce / Just now', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now, true)).toBe('Az önce');
    expect(formatRelativeTime(now, false)).toBe('Just now');
  });

  it('formats minutes ago', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatRelativeTime(tenMinutesAgo, true)).toBe('10 dk önce');
    expect(formatRelativeTime(tenMinutesAgo, false)).toBe('10m ago');
  });

  it('formats hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo, true)).toBe('2 sa önce');
    expect(formatRelativeTime(twoHoursAgo, false)).toBe('2h ago');
  });
});
