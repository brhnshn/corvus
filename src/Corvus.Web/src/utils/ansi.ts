/**
 * ANSI Color & Control Codes to HTML/CSS Safe Span Parser
 * Lightweight, zero-dependency parser for Docker build & pull logs.
 */

export interface AnsiSegment {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

// 16 ANSI Standard Colors (Normal & Bright)
const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'text-zinc-500', // Black
  31: 'text-rose-400', // Red
  32: 'text-emerald-400', // Green
  33: 'text-amber-300', // Yellow
  34: 'text-sky-400', // Blue
  35: 'text-purple-400', // Magenta
  36: 'text-cyan-300', // Cyan
  37: 'text-zinc-200', // White

  // Bright / High-Intensity
  90: 'text-zinc-400', // Bright Black / Gray
  91: 'text-rose-300',
  92: 'text-emerald-300',
  93: 'text-amber-200',
  94: 'text-sky-300',
  95: 'text-purple-300',
  96: 'text-cyan-200',
  97: 'text-white'
};

const ANSI_BG_MAP: Record<number, string> = {
  40: 'bg-zinc-900',
  41: 'bg-rose-950/80',
  42: 'bg-emerald-950/80',
  43: 'bg-amber-950/80',
  44: 'bg-sky-950/80',
  45: 'bg-purple-950/80',
  46: 'bg-cyan-950/80',
  47: 'bg-zinc-200 text-zinc-900',

  100: 'bg-zinc-800',
  101: 'bg-rose-900/80',
  102: 'bg-emerald-900/80',
  103: 'bg-amber-900/80',
  104: 'bg-sky-900/80',
  105: 'bg-purple-900/80',
  106: 'bg-cyan-900/80',
  107: 'bg-white text-zinc-900'
};

/**
 * Strips all ANSI escape codes from string for clean search or clipboard copy
 */
export function stripAnsi(input: string): string {
  if (!input) return '';
  // Match CSI codes like \u001b[...m and OSC codes
  return input.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g, '');
}

/**
 * Parses ANSI escape sequences into structured segments for React rendering.
 */
export function parseAnsiToSegments(input: string): AnsiSegment[] {
  if (!input) return [];

  const segments: AnsiSegment[] = [];
  // Regex to find ANSI escape sequence: \x1b[ ... m or \u001b[ ... m
  const ansiRegex = /\x1b\[([0-9;]*)m/g;

  let lastIndex = 0;
  let currentColorClass: string | undefined = undefined;
  let currentBgClass: string | undefined = undefined;
  let isBold = false;
  let isDim = false;
  let isUnderline = false;

  let match: RegExpExecArray | null;

  while ((match = ansiRegex.exec(input)) !== null) {
    const textBefore = input.substring(lastIndex, match.index);
    if (textBefore) {
      const classes = [
        currentColorClass,
        currentBgClass,
        isBold ? 'font-bold' : '',
        isDim ? 'opacity-70' : '',
        isUnderline ? 'underline' : ''
      ].filter(Boolean).join(' ');

      segments.push({
        text: textBefore,
        className: classes || undefined
      });
    }

    const codeStr = match[1] || '0';
    const codes = codeStr.split(';').map((c) => parseInt(c, 10)).filter((n) => !isNaN(n));

    if (codes.length === 0 || codes.includes(0)) {
      // Reset
      currentColorClass = undefined;
      currentBgClass = undefined;
      isBold = false;
      isDim = false;
      isUnderline = false;
    }

    for (let i = 0; i < codes.length; i++) {
      const code = codes[i];
      if (code === 0) {
        currentColorClass = undefined;
        currentBgClass = undefined;
        isBold = false;
        isDim = false;
        isUnderline = false;
      } else if (code === 1) {
        isBold = true;
      } else if (code === 2) {
        isDim = true;
      } else if (code === 4) {
        isUnderline = true;
      } else if (code === 22) {
        isBold = false;
        isDim = false;
      } else if (code === 24) {
        isUnderline = false;
      } else if (ANSI_COLOR_MAP[code]) {
        currentColorClass = ANSI_COLOR_MAP[code];
      } else if (ANSI_BG_MAP[code]) {
        currentBgClass = ANSI_BG_MAP[code];
      } else if (code === 39) {
        currentColorClass = undefined;
      } else if (code === 49) {
        currentBgClass = undefined;
      }
    }

    lastIndex = ansiRegex.lastIndex;
  }

  // Add trailing text
  const remainingText = input.substring(lastIndex);
  if (remainingText) {
    const classes = [
      currentColorClass,
      currentBgClass,
      isBold ? 'font-bold' : '',
      isDim ? 'opacity-70' : '',
      isUnderline ? 'underline' : ''
    ].filter(Boolean).join(' ');

    segments.push({
      text: remainingText,
      className: classes || undefined
    });
  }

  return segments;
}
