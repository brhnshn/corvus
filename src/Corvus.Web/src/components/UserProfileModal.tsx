import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { UserDto } from '../types';
import { useI18n } from '../i18n';
import { 
  User as UserIcon, 
  Shield, 
  KeyRound, 
  Users, 
  UserPlus, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsername: string;
  currentRole?: string | null;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUsername,
  currentRole = 'viewer'
}) => {
  const { t } = useI18n();
  const isAdmin = currentRole === 'admin';

  // Tabs: 'profile' | 'users'
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  // Users list state
  const [users, setUsers] = useState<UserDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  // Add user state
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [addUserLoading, setAddUserLoading] = useState(false);

  // Delete user state
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPwError(null);
      setPwSuccess(null);
      setUserActionSuccess(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (isAdmin && activeTab === 'users') {
        loadUsers();
      }
    }
  }, [isOpen, activeTab, isAdmin]);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setUsersError(err instanceof Error ? err.message : 'Kullanıcılar alınamadı.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword) {
      setPwError(t('userManagement.currentPasswordPlaceholder'));
      return;
    }
    if (newPassword.length < 4) {
      setPwError(t('userManagement.newPasswordPlaceholder'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t('userManagement.passwordMismatch'));
      return;
    }

    setPwLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPwSuccess(t('userManagement.passwordChanged'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwError(res.message || t('common.error'));
      }
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setPwLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsersError(null);
    setUserActionSuccess(null);

    if (newUsername.trim().length < 3) {
      setUsersError(t('userManagement.usernamePlaceholder'));
      return;
    }
    if (newUserPassword.length < 4) {
      setUsersError(t('userManagement.passwordPlaceholder'));
      return;
    }

    setAddUserLoading(true);
    try {
      const res = await api.createUser({
        username: newUsername.trim(),
        password: newUserPassword,
        role: newUserRole
      });
      if (res.success) {
        setUserActionSuccess(t('userManagement.userCreated'));
        setNewUsername('');
        setNewUserPassword('');
        setNewUserRole('viewer');
        await loadUsers();
      } else {
        setUsersError(res.message || t('common.error'));
      }
    } catch (err: unknown) {
      setUsersError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserDto) => {
    if (user.username === currentUsername) {
      setUsersError(t('userManagement.cannotDeleteSelf'));
      return;
    }

    const confirmMsg = t('userManagement.deleteUserConfirm').replace('{username}', user.username);
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingUserId(user.id);
    setUsersError(null);
    setUserActionSuccess(null);
    try {
      const res = await api.deleteUser(user.id);
      if (res.success) {
        setUserActionSuccess(t('userManagement.userDeleted'));
        await loadUsers();
      } else {
        setUsersError(res.message || t('common.error'));
      }
    } catch (err: unknown) {
      setUsersError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setDeletingUserId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#9ca3af] hover:text-[#e5e7eb] p-1.5 rounded-lg hover:bg-[#1e2130] transition-colors cursor-pointer"
          title={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pb-4 border-b border-[#2a2e3f]">
          <div className="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#e5e7eb]">{t('userManagement.title')}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#9ca3af]">{currentUsername}</span>
              <span className="text-[10px] text-[#2a2e3f]">•</span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md ${
                isAdmin 
                  ? 'bg-purple-950/80 border border-purple-700/60 text-purple-300' 
                  : 'bg-blue-950/80 border border-blue-700/60 text-blue-300'
              }`}>
                <Shield className="w-3 h-3" />
                {isAdmin ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {isAdmin && (
          <div className="flex gap-2 pt-4 border-b border-[#2a2e3f]">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                activeTab === 'profile'
                  ? 'border-purple-400 text-purple-300 bg-[#1e2130]/60'
                  : 'border-transparent text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130]/30'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              {t('userManagement.profileTab')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                activeTab === 'users'
                  ? 'border-purple-400 text-purple-300 bg-[#1e2130]/60'
                  : 'border-transparent text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130]/30'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {t('userManagement.usersTab')}
            </button>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pt-4 pr-1 space-y-4">
          {/* TAB 1: Profile & Password */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f1117] border border-[#2a2e3f] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#9ca3af]">{t('userManagement.currentRole')}</div>
                  <div className="text-sm font-semibold text-[#e5e7eb] mt-0.5">
                    {isAdmin ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}
                  </div>
                </div>
                <div className="text-xs text-[#9ca3af] text-right max-w-xs">
                  {isAdmin 
                    ? t('userManagement.roleAdminDescription') 
                    : t('userManagement.roleViewerDescription')}
                </div>
              </div>

              {/* Password Change Form */}
              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                    {t('userManagement.changePassword')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-1 text-[11px] text-[#9ca3af] hover:text-[#e5e7eb] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? t('common.close') : t('common.details')}</span>
                  </button>
                </div>

                {pwError && (
                  <div className="p-3 bg-red-950/40 border border-red-700/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{pwError}</span>
                  </div>
                )}

                {pwSuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{pwSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                    {t('userManagement.currentPassword')}
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('userManagement.currentPasswordPlaceholder')}
                    className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:outline-hidden focus:border-purple-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                      {t('userManagement.newPassword')}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('userManagement.newPasswordPlaceholder')}
                      className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:outline-hidden focus:border-purple-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
                      {t('userManagement.confirmPassword')}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('userManagement.confirmPasswordPlaceholder')}
                      className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-sm text-[#e5e7eb] focus:outline-hidden focus:border-purple-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={pwLoading || !currentPassword || !newPassword || !confirmPassword}
                    className="flex items-center gap-2 px-4 py-2 bg-[#d4d4d8] text-[#0f1117] rounded-lg font-semibold text-xs hover:bg-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{pwLoading ? t('userManagement.updatingPassword') : t('userManagement.changePassword')}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Users & Roles (Admin Only) */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-5">
              {usersError && (
                <div className="p-3 bg-red-950/40 border border-red-700/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{usersError}</span>
                </div>
              )}

              {userActionSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{userActionSuccess}</span>
                </div>
              )}

              {/* Add New User Form */}
              <div className="p-4 bg-[#0f1117] border border-[#2a2e3f] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]">
                  <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('userManagement.addUser')}</span>
                </div>

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={t('userManagement.usernamePlaceholder')}
                      className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] focus:outline-hidden focus:border-purple-400 transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder={t('userManagement.passwordPlaceholder')}
                      className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] focus:outline-hidden focus:border-purple-400 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'viewer')}
                      className="bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-2.5 py-2 text-xs text-[#e5e7eb] focus:outline-hidden focus:border-purple-400 transition-colors flex-1"
                    >
                      <option value="viewer">{t('userManagement.roleViewer')}</option>
                      <option value="admin">{t('userManagement.roleAdmin')}</option>
                    </select>

                    <button
                      type="submit"
                      disabled={addUserLoading || !newUsername || !newUserPassword}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {addUserLoading ? '...' : t('userManagement.addUser')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Users List Table */}
              <div className="border border-[#2a2e3f] rounded-xl overflow-hidden bg-[#0f1117]">
                <div className="px-4 py-3 border-b border-[#2a2e3f] flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-[#e5e7eb]">
                    {t('userManagement.usersList')}
                  </h4>
                  <span className="text-[11px] font-mono text-[#9ca3af]">
                    {users.length} {t('userManagement.usersList').toLowerCase()}
                  </span>
                </div>

                {usersLoading ? (
                  <div className="p-8 text-center text-xs text-[#9ca3af]">
                    {t('common.loading')}
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#9ca3af]">
                    {t('userManagement.noUsers')}
                  </div>
                ) : (
                  <div className="divide-y divide-[#2a2e3f]">
                    {users.map((u) => {
                      const isSelf = u.username.toLowerCase() === currentUsername.toLowerCase();
                      const isUserAdmin = u.role.toLowerCase() === 'admin';

                      return (
                        <div key={u.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#1a1d29]/60 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#1a1d29] border border-[#2a2e3f] flex items-center justify-center text-[#9ca3af] shrink-0">
                              <UserIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-[#e5e7eb] truncate">
                                  {u.username}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                                    you
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#9ca3af] font-mono mt-0.5">
                                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md ${
                              isUserAdmin
                                ? 'bg-purple-950/80 border border-purple-700/60 text-purple-300'
                                : 'bg-blue-950/80 border border-blue-700/60 text-blue-300'
                            }`}>
                              <Shield className="w-3 h-3" />
                              {isUserAdmin ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}
                            </span>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={deletingUserId === u.id}
                                title={t('userManagement.deleteUser')}
                                className="p-1.5 text-[#9ca3af] hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-900/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
