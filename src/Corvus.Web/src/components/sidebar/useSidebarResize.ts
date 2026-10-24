import { useState, useEffect } from 'react';

const DEFAULT_SIDEBAR_WIDTH = 232;
const MIN_SIDEBAR_WIDTH = 184;
const MAX_SIDEBAR_WIDTH = 320;
const STORAGE_KEY = 'corvus_sidebar_w';
const CSS_VARIABLE = '--sidebar-w';

export function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseInt(stored, 10) || DEFAULT_SIDEBAR_WIDTH : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
      setSidebarWidth(clamped);
      document.documentElement.style.setProperty(CSS_VARIABLE, `${clamped}px`);
      localStorage.setItem(STORAGE_KEY, String(clamped));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const handleDoubleClickResizer = () => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
    document.documentElement.style.setProperty(CSS_VARIABLE, `${DEFAULT_SIDEBAR_WIDTH}px`);
    localStorage.setItem(STORAGE_KEY, String(DEFAULT_SIDEBAR_WIDTH));
  };

  return {
    sidebarWidth,
    isResizing,
    handleMouseDown,
    handleDoubleClickResizer,
  };
}
