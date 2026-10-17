import React, { useEffect, useState, Suspense } from 'react';
import { api, type AuthStatus, invalidateCache } from './api/client';
import { AppLayout } from './components/layout/AppLayout';
import type { PageId } from './components/Sidebar';
import { RegistrationPromptModal } from './components/RegistrationPromptModal';
import { RefreshCw } from 'lucide-react';
import { useI18n } from './i18n';
import { 
  useCommandPalette, 
  CommandPaletteModal, 
  fetchCommandItems, 
  type CommandItem 
} from './components/common/CommandPalette';
import { PageTransition } from './components/common/PageTransition';
import { useToast } from './components/ui/Toast';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { ChunkErrorBoundary } from './components/common/ChunkErrorBoundary';

// Code-splitting via lazyWithRetry for bundle optimization (Roadmap 3.1)
const DashboardPage = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.DashboardPage })));
const ServicesPage = lazyWithRetry(() => import('./pages/Services').then(m => ({ default: m.ServicesPage })));
const ContainersPage = lazyWithRetry(() => import('./pages/Containers').then(m => ({ default: m.ContainersPage })));
const DeploymentsPage = lazyWithRetry(() => import('./pages/Deployments').then(m => ({ default: m.DeploymentsPage })));
const SystemsPage = lazyWithRetry(() => import('./pages/Systems').then(m => ({ default: m.SystemsPage })));
const SystemMetricsPage = lazyWithRetry(() => import('./pages/SystemMetrics').then(m => ({ default: m.SystemMetricsPage })));
const UptimePage = lazyWithRetry(() => import('./pages/Uptime').then(m => ({ default: m.UptimePage })));
const SettingsPage = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazyWithRetry(() => import('./pages/Profile').then(m => ({ default: m.ProfilePage })));
const ContainerDetailPage = lazyWithRetry(() => import('./pages/ContainerDetail').then(m => ({ default: m.ContainerDetailPage })));
const ActivityTimelinePage = lazyWithRetry(() => import('./pages/ActivityTimeline').then(m => ({ default: m.ActivityTimelinePage })));
const AuthPage = lazyWithRetry(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicStatus = lazyWithRetry(() => import('./pages/PublicStatus'));

const PageLoader = () => (
  <div className="flex items-center justify-center py-20 text-[#9ca3af]">
    <div className="flex flex-col items-center gap-2">
      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
      <span className="text-xs font-mono">Loading...</span>
    </div>
  </div>
);

import { useAppNavigation } from './hooks/useAppNavigation';
import { AppRouter } from './components/layout/AppRouter';

export const App: React.FC = () => {
  const { t } = useI18n();
  const toast = useToast();
  const isStatusPath = window.location.pathname === '/status' || window.location.pathname.startsWith('/status');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(!isStatusPath);
  const { currentPage, selectedContainerId, initialAction, navigateTo } = useAppNavigation();
  const [showRegPrompt, setShowRegPrompt] = useState(false);

  const { isOpen: isCmdOpen, open: openCmd, close: closeCmd } = useCommandPalette();
  const [commandItems, setCommandItems] = useState<CommandItem[]>([]);

  const checkAuth = async () => {
    try {
      const status = await api.getAuthStatus();
      setAuthStatus(status);
    } catch (err) {
      console.error('Auth durumu sorgulanamadı:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!isStatusPath) {
      checkAuth();
    }

    const handleUnauthorized = () => {
      checkAuth();
    };

    window.addEventListener('corvus_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('corvus_unauthorized', handleUnauthorized);
  }, [isStatusPath]);

  // Server-Sent Events (SSE) — Canlı Veri Yayını Bağlantısı (Yüksek Dayanıklılık Mimarisi)
  // Ağ kopsa bile asla pes etmez; backoff ile dener, internet geri geldiğinde veya
  useEffect(() => {
    if (isStatusPath) return;
    if (authLoading) return;
    if (authStatus && authStatus.authEnabled && !authStatus.isAuthenticated) return;

    let eventSource: EventSource | null = null;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      try {
        eventSource = new EventSource('/api/stream/events');

        eventSource.onopen = () => {
          retryCount = 0; // Bağlantı başarılıysa sayacı sıfırla
        };

        eventSource.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('corvus_event', { detail: parsed }));
            const eventType: string | undefined = parsed.eventType || parsed.type;
            if (eventType?.includes('container')) {
              invalidateCache('/containers');
              invalidateCache('/dashboard');
            } else if (eventType?.includes('service')) {
              invalidateCache('/services');
              invalidateCache('/dashboard');
            } else if (eventType?.includes('push') || eventType?.includes('snitch')) {
              invalidateCache('/push-monitors');
              invalidateCache('/dashboard');
            }
          } catch {
            // keepalive/ping mesajları JSON olmayabilir
          }
        };

        eventSource.onerror = () => {
          if (isDisposed) return;
          eventSource?.close();
          eventSource = null;

          // Üstel geri çekilme (exponential backoff): 1s, 2s, 4s, 8s, 16s ... max 20s aralıkla yeniden bağlan
          const delay = Math.min(1000 * 2 ** Math.min(retryCount, 4), 20000);
          retryCount++;
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(connect, delay);
        };
      } catch (e) {
        console.warn('[SSE] EventSource oluşturulamadı:', e);
      }
    };

    const handleOnline = () => {
      if (isDisposed) return;
      if (retryTimer) clearTimeout(retryTimer);
      retryCount = 0;
      invalidateCache(); // İnternet geri geldiğinde bayat önbelleği temizle
      connect();
    };

    const handleVisibility = () => {
      if (isDisposed) return;
      if (document.visibilityState === 'visible') {
        // Sekme tekrar öne geldiğinde bağlantı kopuksa hemen canlandır
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          if (retryTimer) clearTimeout(retryTimer);
          retryCount = 0;
          invalidateCache();
          connect();
        }
      }
    };

    connect();
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isDisposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      eventSource?.close();
    };
  }, [isStatusPath, authLoading, authStatus?.isAuthenticated, authStatus?.authEnabled]);

  const getPageTitle = (page: PageId) => {
    switch (page) {
      case 'dashboard': return t('nav.dashboard');
      case 'services': return t('nav.services');
      case 'containers': return t('nav.containers');
      case 'systems': return t('nav.systems');
      case 'metrics': return t('nav.metrics');
      case 'uptime': return t('nav.uptime');
      case 'activity': return t('nav.activity');
      case 'settings': return t('nav.settings');
      case 'profile': return t('nav.profile');
    }
  };

  // Sayfa ve dil değişimlerine göre dinamik tarayıcı sekme başlığı (document.title)
  // Kurallar gereği tüm hook'lar erken dönüşlerden (return) önce çağrılmalıdır
  useEffect(() => {
    if (isStatusPath) {
      document.title = `${t('publicStatus.badge')} - Corvus`;
    } else if (authStatus && authStatus.authEnabled && !authStatus.isAuthenticated) {
      document.title = `${t('auth.tabLogin')} - Corvus`;
    } else if (currentPage === 'containers' && selectedContainerId) {
      document.title = `${t('containers.detailTitle')} - Corvus`;
    } else {
      document.title = `${getPageTitle(currentPage)} - Corvus`;
    }
  }, [currentPage, selectedContainerId, isStatusPath, authStatus, t]);

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

  const handleAuthSuccess = async (isNewRegistration: boolean) => {
    try {
      const status = await api.getAuthStatus();
      setAuthStatus(status);

      if (isNewRegistration && status.registrationEnabled) {
        setShowRegPrompt(true);
      }
    } catch (err) {
      console.error('Auth yenilenemedi:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      await checkAuth();
    } catch (err) {
      console.error('Çıkış hatası:', err);
    }
  };

  const handleRegistrationDisabled = () => {
    if (authStatus) {
      setAuthStatus({
        ...authStatus,
        registrationEnabled: false
      });
    }
  };

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
