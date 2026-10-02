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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#e5e7eb] tracking-tight">
          {t('userManagement.title')}
        </h2>
        <p className="text-xs text-[#9ca3af] mt-1">
          Kullanıcı profilinizi, güvenlik ayarlarınızı ve ekip rollerini yönetin
        </p>
      </div>

      {/* Sekmeler */}
      <div className="flex items-center gap-2 border-b border-[#2a2e3f] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-[#1a1d29] text-white border border-[#2a2e3f] shadow-xs'
              : 'text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d29]/50'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
          <span>{t('userManagement.profileTab')}</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#1a1d29] text-white border border-[#2a2e3f] shadow-xs'
                : 'text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d29]/50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('userManagement.usersTab')}</span>
          </button>
        )}
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
