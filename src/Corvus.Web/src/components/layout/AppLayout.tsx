import React, { useState } from 'react';
import { Sidebar, type PageId } from '../Sidebar';
import { BottomNav } from '../BottomNav';
import { ToastProvider } from '../ui/Toast';
import { Navbar } from './Navbar';

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

  // Sol menü (Sidebar) ve Mobil Bar: Sadece sunucu içindeki operasyonel sayfalarda açılır.
  // 'systems' (Filo) ve 'profile' (Kullanıcı Yönetimi) sayfalarında gizlenir.
  const isNavStandalone = currentPage === 'systems' || currentPage === 'profile';

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col relative selection:bg-indigo-500/30 selection:text-white">
        {/* Her zaman en üstte yer alan kalıcı Corvus Navbar */}
        <Navbar
          currentPage={currentPage}
          onSelectPage={onSelectPage}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          onOpenCommandPalette={onOpenCommandPalette}
          username={username}
          role={role}
          onLogout={onLogout}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        <div className="flex-1 flex flex-col lg:flex-row relative">
          {/* Desktop Sidebar: Yalnızca bir sunucunun içine girildiğinde açılır. Filo ve Profil ekranlarında asla açılmaz. */}
          {!isNavStandalone && (
            <Sidebar
              currentPage={currentPage}
              onSelectPage={onSelectPage}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebar}
              onOpenCommandPalette={onOpenCommandPalette}
            />
          )}

          {/* Ana İçerik Alanı */}
          <div
            className={`
              flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-[cubic-bezier(.22,1,.36,1)]
              ${!isNavStandalone && !isSidebarCollapsed ? 'lg:ml-64' : 'lg:ml-0'}
            `}
          >
            <main
              className={`
                flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-28 lg:pb-12
                ${isNavStandalone ? 'max-w-[1400px]' : 'max-w-[1240px]'}
              `}
            >
              {children}
            </main>
          </div>

          {/* Mobil Cam Altbar: Yalnızca sunucu içi sayfalarda aktif */}
          {!isNavStandalone && (
            <BottomNav currentPage={currentPage} onSelectPage={onSelectPage} />
          )}
        </div>
      </div>
    </ToastProvider>
  );
};

