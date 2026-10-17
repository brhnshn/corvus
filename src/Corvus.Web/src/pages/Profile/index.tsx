import React, { useState } from 'react';
import { KeyRound, Users, ArrowLeft } from 'lucide-react';
import { useI18n } from '../../i18n';
import { ProfileSecurityTab } from './ProfileSecurityTab';
import { ProfileUsersTab } from './ProfileUsersTab';
import type { PageId } from '../../components/Sidebar';

interface ProfilePageProps {
  username?: string | null;
  role?: string | null;
  onNavigate?: (page: PageId) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  username = '',
  role = 'viewer',
  onNavigate
}) => {
  const { t } = useI18n();
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState<'security' | 'users'>('security');

  const tabs = [
    { id: 'security' as const, label: t('userManagement.profileTab'), icon: KeyRound },
    ...(isAdmin ? [{ id: 'users' as const, label: t('userManagement.usersTab'), icon: Users }] : [])
  ];

  return (
    <div className="space-y-5 animate-rv max-w-4xl">
      {/* Geri Dönüş / Breadcrumb */}
      {onNavigate && (
        <div>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('nav.dashboard')}</span>
          </button>
        </div>
      )}

      {/* Header & Sekmeler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {t('userManagement.title')}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t('userManagement.subtitle')}
          </p>
        </div>

        {/* Obsidian Standart Sekmeler */}
        <div className="tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`tab ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aktif Sekme İçeriği */}
      {activeTab === 'security' ? (
        <ProfileSecurityTab
          currentUsername={username || 'User'}
          currentRole={role || 'viewer'}
        />
      ) : (
        isAdmin && <ProfileUsersTab currentUsername={username || 'User'} />
      )}
    </div>
  );
};

export default ProfilePage;
