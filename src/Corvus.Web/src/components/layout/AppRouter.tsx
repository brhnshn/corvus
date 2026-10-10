import React from 'react';
import type { PageId } from '../Sidebar';

// Lazy loaded page components passed down from App or imported directly
interface AppRouterProps {
  currentPage: PageId;
  selectedContainerId: string | null;
  initialAction?: string | null;
  isAdmin: boolean;
  username?: string | null;
  role?: string | null;
  onNavigate: (page: PageId, containerId?: string | null, tab?: string | null) => void;
  DashboardPage: React.ComponentType<{ onNavigate: (page: PageId, containerId?: string | null, tab?: string | null) => void }>;
  ServicesPage: React.ComponentType<{}>;
  ContainersPage: React.ComponentType<{ isAdmin: boolean; initialAction?: string | null; onNavigateToDetail: (id: string, tab?: string) => void }>;
  ContainerDetailPage: React.ComponentType<{ containerId: string; onBack: () => void; isAdmin: boolean }>;
  SystemMetricsPage: React.ComponentType<{}>;
  UptimePage: React.ComponentType<{}>;
  ActivityTimelinePage: React.ComponentType<{}>;
  SettingsPage: React.ComponentType<{}>;
  ProfilePage: React.ComponentType<{ username?: string; role?: string }>;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  currentPage,
  selectedContainerId,
  initialAction,
  isAdmin,
  username,
  role,
  onNavigate,
  DashboardPage,
  ServicesPage,
  ContainersPage,
  ContainerDetailPage,
  SystemMetricsPage,
  UptimePage,
  ActivityTimelinePage,
  SettingsPage,
  ProfilePage,
}) => {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage onNavigate={onNavigate} />;
    case 'services':
      return <ServicesPage />;
    case 'containers':
      if (selectedContainerId) {
        return (
          <ContainerDetailPage
            containerId={selectedContainerId}
            onBack={() => onNavigate('containers')}
            isAdmin={isAdmin}
          />
        );
      }
      return (
        <ContainersPage
          isAdmin={isAdmin}
          initialAction={initialAction}
          onNavigateToDetail={(id, tab) => onNavigate('containers', id, tab)}
        />
      );
    case 'metrics':
      return <SystemMetricsPage />;
    case 'uptime':
      return <UptimePage />;
    case 'activity':
      return <ActivityTimelinePage />;
    case 'settings':
      return <SettingsPage />;
    case 'profile':
      return <ProfilePage username={username ?? undefined} role={role ?? undefined} />;
    default:
      return <DashboardPage onNavigate={onNavigate} />;
  }
};
