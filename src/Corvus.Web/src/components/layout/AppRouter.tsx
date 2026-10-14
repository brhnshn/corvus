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
  ServicesPage: React.ComponentType<{ isAdmin?: boolean; role?: string | null }>;
  ContainersPage: React.ComponentType<{ isAdmin: boolean; role?: string | null; initialAction?: string | null; onNavigateToDetail: (id: string, tab?: string) => void }>;
  ContainerDetailPage: React.ComponentType<{ containerId: string; onBack: () => void; isAdmin: boolean; role?: string | null }>;
  SystemsPage: React.ComponentType<{ isAdmin: boolean; username?: string | null; role?: string | null; onNavigate?: (page: PageId, containerId?: string | null, tab?: string | null) => void }>;
  SystemMetricsPage: React.ComponentType<{}>;
  UptimePage: React.ComponentType<{}>;
  ActivityTimelinePage: React.ComponentType<{}>;
  SettingsPage: React.ComponentType<{ isAdmin?: boolean; username?: string | null; role?: string | null }>;
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
  SystemsPage,
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
      return <ServicesPage isAdmin={isAdmin} role={role} />;
    case 'containers':
      if (selectedContainerId) {
        return (
          <ContainerDetailPage
            containerId={selectedContainerId}
            onBack={() => onNavigate('containers')}
            isAdmin={isAdmin}
            role={role}
          />
        );
      }
      return (
        <ContainersPage
          isAdmin={isAdmin}
          role={role}
          initialAction={initialAction}
          onNavigateToDetail={(id, tab) => onNavigate('containers', id, tab)}
        />
      );
    case 'systems':
      return <SystemsPage isAdmin={isAdmin} username={username} role={role} onNavigate={onNavigate} />;
    case 'metrics':
      return <SystemMetricsPage />;
    case 'uptime':
      return <UptimePage />;
    case 'activity':
      return <ActivityTimelinePage />;
    case 'settings':
      return <SettingsPage isAdmin={isAdmin} username={username} role={role} />;
    case 'profile':
      return <ProfilePage username={username ?? undefined} role={role ?? undefined} />;
    default:
      return <DashboardPage onNavigate={onNavigate} />;
  }
};
