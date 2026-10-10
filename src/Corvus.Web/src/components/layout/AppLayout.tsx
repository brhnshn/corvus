import React, { useState } from 'react';
import { Sidebar, type PageId } from '../Sidebar';
import { BottomNav } from '../BottomNav';
import { ToastProvider } from '../ui/Toast';
import { PanelLeftOpen } from 'lucide-react';

export interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  username?: string | null;
  role?: string | null;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentPage,
  onSelectPage,
  username,
  role,
  onLogout,
  onOpenCommandPalette,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('corvus_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('corvus_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col lg:flex-row relative">
        {/* Desktop Sidebar (Açılır / Kapanır) */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={onSelectPage}
          username={username}
          role={role}
          onLogout={onLogout}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenCommandPalette={onOpenCommandPalette}
        />

        {/* Kenar Çubuğu Kapalıyken Havada Duran Corvus Logolu Açma Butonu */}
        {isSidebarCollapsed && (
          <div className="hidden lg:block fixed top-3.5 left-4 z-50 animate-in fade-in-0 slide-in-from-left-4 duration-300">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Menüyü Göster"
              aria-label="Menüyü Göster"
              className="glass group flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 hover:border-white/30 hover:bg-white/[0.12] transition-all duration-300 shadow-xl cursor-pointer active:scale-95"
            >
              <img
                src="/logo_transparent.png"
                alt="Corvus"
                className="w-5 h-5 object-contain shrink-0 group-hover:rotate-12 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-mono text-xs font-bold text-[#eceef6] tracking-wider">
                CORVUS
              </span>
              <span className="p-1 rounded-full text-[#9ba0b5] group-hover:text-white transition-colors">
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        )}

        {/* Ana İçerik Alanı (Sidebar durumuna göre animasyonlu margin) */}
        <div
          className={`
            flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-[cubic-bezier(.22,1,.36,1)]
            ${isSidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64'}
          `}
        >
          <main className="flex-1 w-full max-w-[1180px] mx-auto px-3 sm:px-4 lg:px-6 pt-3.5 sm:pt-5 pb-28 lg:pb-10">
            {children}
          </main>
        </div>

        {/* Mobil Cam Altbar (lg altında aktif) */}
        <BottomNav currentPage={currentPage} onSelectPage={onSelectPage} />
      </div>
    </ToastProvider>
  );
};
