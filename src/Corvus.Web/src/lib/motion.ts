/**
 * Corvus × ObsidianUI Motion Design System
 * Spring physics, stagger orchestrators, and runtime motion speed scaling.
 */

export const obsidianSpring = {
  type: 'spring',
  stiffness: 380,
  damping: 32,
  mass: 0.8,
} as const;

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.042 },
  },
} as const;

export const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

export const MOTION_SCALES = {
  NORMAL: 1,
  SLOW_MO: 2.8,
  INSTANT: 0.01,
} as const;

export type MotionScaleKey = 'normal' | 'slow' | 'instant';

const MOTION_STORAGE_KEY = 'corvus_motion_scale';
const THEME_STORAGE_KEY = 'corvus_theme_mode';

/**
 * Gets the current runtime motion scale (default: 1).
 */
export function getMotionScale(): number {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem(MOTION_STORAGE_KEY);
  return stored ? parseFloat(stored) || 1 : 1;
}

/**
 * Sets the motion scale on document element and localStorage.
 * Adjusts all CSS animation & transition durations uniformly.
 */
export function setMotionScale(scale: number): void {
  if (typeof document === 'undefined') return;
  const safeScale = Math.max(0.01, scale);
  document.documentElement.style.setProperty('--motion-scale', String(safeScale));
  localStorage.setItem(MOTION_STORAGE_KEY, String(safeScale));
  window.dispatchEvent(new CustomEvent('corvus_motion_scale_changed', { detail: safeScale }));
}

/**
 * Returns current theme mode ('dark' or 'light').
 */
export function getThemeMode(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  const mode = localStorage.getItem(THEME_STORAGE_KEY) || document.documentElement.getAttribute('data-mode');
  return mode === 'light' ? 'light' : 'dark';
}

/**
 * Sets theme mode ('dark' or 'light') on html attribute and localStorage.
 */
export function setThemeMode(mode: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-mode', mode);
  if (mode === 'light') {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent('corvus_theme_changed', { detail: mode }));
}

/**
 * Toggles theme mode between dark and light.
 */
export function toggleThemeMode(): 'dark' | 'light' {
  const next = getThemeMode() === 'dark' ? 'light' : 'dark';
  setThemeMode(next);
  return next;
}

// Auto-initialize stored scale & theme on load
if (typeof window !== 'undefined') {
  const initialScale = getMotionScale();
  if (initialScale !== 1) {
    document.documentElement.style.setProperty('--motion-scale', String(initialScale));
  }
  const initialTheme = getThemeMode();
  setThemeMode(initialTheme);
}
