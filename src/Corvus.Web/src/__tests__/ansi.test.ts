import { describe, it, expect } from 'vitest';
import { parseAnsiToSegments, stripAnsi } from '../utils/ansi';

describe('ansi utility', () => {
  describe('stripAnsi', () => {
    it('returns empty string for null/undefined/empty input', () => {
      expect(stripAnsi('')).toBe('');
      expect(stripAnsi(null as any)).toBe('');
    });

    it('strips color and formatting codes from text', () => {
      const input = '\x1b[31mError:\x1b[0m \x1b[1mContainer failed\x1b[0m';
      expect(stripAnsi(input)).toBe('Error: Container failed');
    });

    it('strips multi-code ANSI sequences and CSI commands', () => {
      const input = '\x1b[32;1mSuccess\x1b[0m: image pulled \x1b[90m(2.4s)\x1b[0m';
      expect(stripAnsi(input)).toBe('Success: image pulled (2.4s)');
    });
  });

  describe('parseAnsiToSegments', () => {
    it('returns single unstyled segment for plain text', () => {
      const segments = parseAnsiToSegments('Hello Docker build');
      expect(segments).toEqual([
        { text: 'Hello Docker build', className: undefined }
      ]);
    });

    it('parses colored text into styled segments', () => {
      const input = 'Normal \x1b[31mRed text\x1b[0m normal again';
      const segments = parseAnsiToSegments(input);

      expect(segments.length).toBe(3);
      expect(segments[0]).toEqual({ text: 'Normal ', className: undefined });
      expect(segments[1]).toEqual({ text: 'Red text', className: 'text-rose-400' });
      expect(segments[2]).toEqual({ text: ' normal again', className: undefined });
    });

    it('combines bold and bright colors correctly', () => {
      const input = '\x1b[1;32mDONE\x1b[0m';
      const segments = parseAnsiToSegments(input);

      expect(segments.length).toBe(1);
      expect(segments[0].text).toBe('DONE');
      expect(segments[0].className).toContain('text-emerald-400');
      expect(segments[0].className).toContain('font-bold');
    });

    it('handles multiple reset and chained sequences', () => {
      const input = '\x1b[33mPulling\x1b[0m -> \x1b[32mExtracted\x1b[0m';
      const segments = parseAnsiToSegments(input);

      expect(segments.length).toBe(3);
      expect(segments[0].text).toBe('Pulling');
      expect(segments[0].className).toBe('text-amber-300');
      expect(segments[1].text).toBe(' -> ');
      expect(segments[2].text).toBe('Extracted');
      expect(segments[2].className).toBe('text-emerald-400');
    });
  });
});
