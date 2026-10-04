import React, { useState } from 'react';
import { KeyRound, Users } from 'lucide-react';
import { useI18n } from '../../i18n';
import { ProfileSecurityTab } from './ProfileSecurityTab';
import { ProfileUsersTab } from './ProfileUsersTab';

interface ProfilePageProps {
  username?: string | null;
  role?: string | null;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  username = '',
  role = 'viewer'
}) => {
  const { t } = useI18n();
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState<'security' | 'users'>('security');

  const tabs = [
    { id: 'security' as const, label: t('userManagement.profileTab') || 'Güvenlik & Profil', icon: KeyRound },
    ...(isAdmin ? [{ id: 'users' as const, label: t('userManagement.usersTab') || 'Kullanıcı Yönetimi', icon: Users }] : [])
  ];

  return (
    <div className="space-y-4 animate-rv">
      {/* Header & Sekmeler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#eceef6]">
            {t('userManagement.title') || 'Profil & Kullanıcı Yönetimi'}
          </h1>
          <p className="text-[13px] text-[#9ba0b5] mt-0.5">
            Kullanıcı profilinizi, güvenlik ayarlarınızı ve ekip rollerini yönetin
          </p>
        </div>

        {/* Sekmeler */}
        <div className="glass rounded-[19px] p-[3px] flex gap-0.5 self-start sm:self-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[16px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs'
                    : 'text-[#9ba0b5] hover:text-[#eceef6]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1b1d2a]' : 'text-[#9ba0b5]'}`} />
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
