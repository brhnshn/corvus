import React, { useState, useEffect } from 'react';
import { Sidebar, type PageId } from '../Sidebar';
import { BottomNav } from '../BottomNav';
import { ToastProvider } from '../ui/Toast';
import { Header } from './Header';

export interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  username?: string | null;
  role?: string | null;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPage,
  onSelectPage,
  username,
  role,
  onLogout,
  onOpenCommandPalette,
  onRefresh,
  isRefreshing = false,
}) => {
  const [activeSystemName, setActiveSystemName] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Host';
    return localStorage.getItem('corvus_active_system_name') || 'Host';
  });

  useEffect(() => {
    const handleSystemChange = () => {
      setActiveSystemName(localStorage.getItem('corvus_active_system_name') || 'Host');
    };
    window.addEventListener('corvus_active_system_changed', handleSystemChange);
    return () => window.removeEventListener('corvus_active_system_changed', handleSystemChange);
  }, []);

  return (
    <ToastProvider>
      <div className="shell selection:bg-[var(--cloud-300)] selection:text-[var(--bg-canvas)]">
        {/* Desktop & Collapsible Sidebar - Permanently Visible */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={onSelectPage}
          onOpenCommandPalette={onOpenCommandPalette}
          activeSystemName={activeSystemName}
        />

        {/* Main Workspace Area (Header + Scrollable Page Body) */}
        <div className="workspace">
          <Header
            currentPage={currentPage}
            onSelectPage={onSelectPage}
            activeSystemName={activeSystemName}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            username={username}
            role={role}
            onLogout={onLogout}
          />

          <main className="page-body">
            <div className={`w-full mx-auto pb-24 lg:pb-12 ${currentPage === 'systems' ? 'max-w-[1440px]' : currentPage === 'settings' ? 'max-w-5xl' : 'max-w-[1240px]'}`}>
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="lg:hidden">
          <BottomNav currentPage={currentPage} onSelectPage={onSelectPage} />
        </div>
      </div>
    </ToastProvider>
  );
};
