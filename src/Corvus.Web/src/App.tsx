import React, { useEffect, useState, Suspense } from 'react';
import { invalidateCache } from './api/client';
import { AppLayout } from './components/layout/AppLayout';
import { RegistrationPromptModal } from './components/RegistrationPromptModal';
import { useI18n } from './i18n';
import { 
  useCommandPalette, 
  CommandPaletteModal, 
  fetchCommandItems, 
  type CommandItem 
} from './components/common/CommandPalette';
import { PageTransition } from './components/common/PageTransition';
import { useToast } from './components/ui/ToastContext';
import { ChunkErrorBoundary } from './components/common/ChunkErrorBoundary';
import { PageLoader } from './components/common/PageLoader';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useAuthStatus } from './hooks/useAuthStatus';
import { useEventStream } from './hooks/useEventStream';
import { useDocumentTitle } from './hooks/useDocumentTitle';
import { AppRouter } from './components/layout/AppRouter';
import {
  DashboardPage,
  ServicesPage,
  ContainersPage,
  DeploymentsPage,
  SystemsPage,
  SystemMetricsPage,
  UptimePage,
  SettingsPage,
  ProfilePage,
  ContainerDetailPage,
  ActivityTimelinePage,
  AuthPage,
  PublicStatus,
} from './lazyPages';

export const App: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();
  const isStatusPath = window.location.pathname === '/status' || window.location.pathname.startsWith('/status');

  const {
    authStatus,
    authLoading,
    showRegPrompt,
    setShowRegPrompt,
    handleAuthSuccess,
    handleLogout,
    handleRegistrationDisabled,
  } = useAuthStatus(isStatusPath);

  const { currentPage, selectedContainerId, initialAction, navigateTo } = useAppNavigation();
  const { isOpen: isCmdOpen, open: openCmd, close: closeCmd } = useCommandPalette();
  const [commandItems, setCommandItems] = useState<CommandItem[]>([]);

  useEventStream({
    isStatusPath,
    authLoading,
    authEnabled: authStatus?.authEnabled,
    isAuthenticated: authStatus?.isAuthenticated,
  });

  useDocumentTitle({
    currentPage,
    selectedContainerId,
    isStatusPath,
    authStatus,
  });

  // Komut paleti açıldığında taze öğeleri yükle (Tüm hook'lar erken return'lerden ÖNCE olmalıdır)
  useEffect(() => {
    if (isCmdOpen) {
      fetchCommandItems({
        t,
        onNavigate: navigateTo,
        onRefreshData: () => invalidateCache(),
        toast,
      }).then(setCommandItems);
    }
  }, [isCmdOpen, t, navigateTo, toast]);

  // Roadmap 1.6: Halka Açık Şifresiz Durum Sayfası
  if (isStatusPath) {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <PublicStatus />
        </Suspense>
      </ChunkErrorBoundary>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-xs text-white/50 font-mono tracking-wider">{t('common.loading')}</span>
        </div>
      </div>
    );
  }

  // Auth aktif ve kullanıcı giriş yapmamış ise Login/Register sayfasını göster
  if (authStatus && authStatus.authEnabled && !authStatus.isAuthenticated) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthPage authStatus={authStatus} onAuthSuccess={handleAuthSuccess} />
      </Suspense>
    );
  }

  const isAdmin = !authStatus?.authEnabled || authStatus?.role === 'admin';

  return (
    <AppLayout
      currentPage={currentPage}
      onSelectPage={navigateTo}
      username={authStatus?.username}
      role={authStatus?.role}
      onLogout={authStatus?.authEnabled ? handleLogout : undefined}
      onOpenCommandPalette={openCmd}
      onRefresh={() => {
        invalidateCache();
        toast.success(t('common.refreshed'));
      }}
    >
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <PageTransition pageKey={`${currentPage}-${selectedContainerId || 'root'}`}>
            <AppRouter
              currentPage={currentPage}
              selectedContainerId={selectedContainerId}
              initialAction={initialAction}
              isAdmin={isAdmin}
              username={authStatus?.username}
              role={authStatus?.role}
              onNavigate={navigateTo}
              DashboardPage={DashboardPage}
              ServicesPage={ServicesPage}
              ContainersPage={ContainersPage}
              ContainerDetailPage={ContainerDetailPage}
              DeploymentsPage={DeploymentsPage}
              SystemsPage={SystemsPage}
              SystemMetricsPage={SystemMetricsPage}
              UptimePage={UptimePage}
              ActivityTimelinePage={ActivityTimelinePage}
              SettingsPage={SettingsPage}
              ProfilePage={ProfilePage}
            />
          </PageTransition>
        </Suspense>
      </ChunkErrorBoundary>

      {/* Komut Paleti Modal */}
      <CommandPaletteModal
        isOpen={isCmdOpen}
        onClose={closeCmd}
        items={commandItems}
      />

      {/* Kayıtları kapatma öneri modalı */}
      <RegistrationPromptModal
        isOpen={showRegPrompt}
        onClose={() => setShowRegPrompt(false)}
        onDisabled={handleRegistrationDisabled}
      />
    </AppLayout>
  );
};

export default App;
