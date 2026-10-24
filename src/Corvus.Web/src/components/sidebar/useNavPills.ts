import { useState, useRef, useCallback, useEffect } from 'react';
import type { PageId } from '../Sidebar';

export function useNavPills(currentPage: PageId, sidebarWidth: number) {
  const [hoverPill, setHoverPill] = useState<{ top: number; opacity: number }>({ top: 0, opacity: 0 });
  const [activePill, setActivePill] = useState<{ top: number; opacity: number }>({ top: 0, opacity: 0 });
  const navRef = useRef<HTMLElement>(null);

  // Update active pill position when currentPage changes
  const updateActivePill = useCallback(() => {
    if (!navRef.current) return;
    const activeBtn = navRef.current.querySelector<HTMLButtonElement>(`button[data-nav="${currentPage}"]`);
    if (activeBtn) {
      setActivePill({ top: activeBtn.offsetTop, opacity: 1 });
    } else {
      setActivePill((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [currentPage]);

  useEffect(() => {
    updateActivePill();
  }, [updateActivePill, sidebarWidth]);

  const handleMouseEnterButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    const top = e.currentTarget.offsetTop;
    setHoverPill({ top, opacity: 1 });
  };

  const handleMouseLeaveNav = () => {
    setHoverPill((prev) => ({ ...prev, opacity: 0 }));
  };

  return {
    navRef,
    hoverPill,
    activePill,
    handleMouseEnterButton,
    handleMouseLeaveNav,
  };
}
