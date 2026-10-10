import React, { useEffect, useState, Suspense, lazy } from 'react';
import { api, type AuthStatus, invalidateCache } from './api/client';
import { AppLayout } from './components/layout/AppLayout';
import type { PageId } from './components/Sidebar';
import { RegistrationPromptModal } from './components/RegistrationPromptModal';
import { RefreshCw } from 'lucide-react';
import { useI18n } from './i18n';

// Chunk yükleme hatalarını (yeni dağıtımlarda 404 veren eski JS dosyalarını) yakalayıp tazeleyen dirençli lazy sarmalayıcı
function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_reload_retry') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.removeItem('chunk_reload_retry');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('chunk_reload_retry', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      window.sessionStorage.removeItem('chunk_reload_retry');
      throw error;
    }
  });
}

// Code-splitting via lazyWithRetry for bundle optimization (Roadmap 3.1)
const DashboardPage = lazyWithRetry(() => import('./pages/Dashboard').then(m => ({ default: m.DashboardPage })));
const ServicesPage = lazyWithRetry(() => import('./pages/Services').then(m => ({ default: m.ServicesPage })));
const ContainersPage = lazyWithRetry(() => import('./pages/Containers').then(m => ({ default: m.ContainersPage })));
const SystemMetricsPage = lazyWithRetry(() => import('./pages/SystemMetrics').then(m => ({ default: m.SystemMetricsPage })));
const UptimePage = lazyWithRetry(() => import('./pages/Uptime').then(m => ({ default: m.UptimePage })));
const SettingsPage = lazyWithRetry(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazyWithRetry(() => import('./pages/Profile').then(m => ({ default: m.ProfilePage })));
const ContainerDetailPage = lazyWithRetry(() => import('./pages/ContainerDetail').then(m => ({ default: m.ContainerDetailPage })));
const AuthPage = lazyWithRetry(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const PublicStatus = lazyWithRetry(() => import('./pages/PublicStatus'));

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class ChunkErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md sheet-glass border border-white/10 rounded-[28px] p-8 space-y-4 shadow-2xl">
            <RefreshCw className="w-10 h-10 text-white mx-auto animate-spin" />
            <h2 className="text-lg font-bold text-white">Yeni Sürüm Algılandı</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              Sistem güncellendiği için sayfanın taze varlıklarla yeniden yüklenmesi gerekiyor.
            </p>
            <button
              onClick={() => {
                window.sessionStorage.removeItem('chunk_reload_retry');
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-white hover:bg-white/90 rounded-xl text-xs font-semibold text-black transition-all cursor-pointer shadow-md"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const PageLoader = () => (
  <div className="flex items-center justify-center py-20 text-[#9ca3af]">
    <div className="flex flex-col items-center gap-2">
      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
      <span className="text-xs font-mono">Loading...</span>
    </div>
  </div>
);

const VALID_PAGES: PageId[] = ['dashboard', 'services', 'containers', 'metrics', 'uptime', 'settings', 'profile'];

interface ParsedRoute {
  page: PageId;
  containerId: string | null;
}

const parseCurrentRoute = (): ParsedRoute => {
  const path = window.location.pathname.replace(/^\//, '');
  const segments = path.split('/');
  const first = segments[0]?.toLowerCase() as PageId;
  if (first === 'containers' && segments[1]) {
    return { page: 'containers', containerId: segments[1] };
  }
  if (VALID_PAGES.includes(first)) {
    return { page: first, containerId: null };
  }
  return { page: 'dashboard', containerId: null };
};

export const App: React.FC = () => {
  const { t } = useI18n();
  const isStatusPath = window.location.pathname === '/status' || window.location.pathname.startsWith('/status');
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(!isStatusPath);
  const [currentRoute, setCurrentRoute] = useState<ParsedRoute>(parseCurrentRoute);
  const currentPage = currentRoute.page;
  const selectedContainerId = currentRoute.containerId;
  const [showRegPrompt, setShowRegPrompt] = useState(false);

  const navigateTo = (page: PageId, containerId?: string | null) => {
    const newRoute: ParsedRoute = { page, containerId: containerId || null };
    setCurrentRoute(newRoute);
    let newPath = page === 'dashboard' ? '/' : `/${page}`;
    if (page === 'containers' && containerId) {
      newPath = `/containers/${containerId}`;
    }
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  };

  // Tarayıcı Geri/İleri butonları için popstate dinleyicisi
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(parseCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      case 'metrics': return t('nav.metrics');
      case 'uptime': return t('nav.uptime');
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
      document.title = `${t('containers.detailTitle') || 'Konteyner Detayı'} - Corvus`;
    } else {
      document.title = `${getPageTitle(currentPage)} - Corvus`;
    }
  }, [currentPage, selectedContainerId, isStatusPath, authStatus, t]);

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

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigateTo} />;
      case 'services':
        return <ServicesPage />;
      case 'containers':
        if (selectedContainerId) {
          return (
            <ContainerDetailPage
              containerId={selectedContainerId}
              onBack={() => navigateTo('containers')}
              isAdmin={isAdmin}
            />
          );
        }
        return (
          <ContainersPage
            isAdmin={isAdmin}
            onNavigateToDetail={(id) => navigateTo('containers', id)}
          />
        );
      case 'metrics':
        return <SystemMetricsPage />;
      case 'uptime':
        return <UptimePage />;
      case 'settings':
        return <SettingsPage />;
      case 'profile':
        return <ProfilePage username={authStatus?.username} role={authStatus?.role} />;
      default:
        return <DashboardPage onNavigate={navigateTo} />;
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onSelectPage={navigateTo}
      username={authStatus?.username}
      role={authStatus?.role}
      onLogout={authStatus?.authEnabled ? handleLogout : undefined}
    >
      <ChunkErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </ChunkErrorBoundary>

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
