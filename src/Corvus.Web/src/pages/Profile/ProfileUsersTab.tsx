import React, { useState, useEffect } from 'react';
import { UserPlus, User as UserIcon, Shield, Trash2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import type { UserDto } from '../../types';
import { useI18n } from '../../i18n';
import { AddUserModal } from './AddUserModal';

interface ProfileUsersTabProps {
  currentUsername: string;
}

export const ProfileUsersTab: React.FC<ProfileUsersTabProps> = ({ currentUsername }) => {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kullanıcılar alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeleteUser = async (user: UserDto) => {
    if (user.username.toLowerCase() === currentUsername.toLowerCase()) {
      setError(t('userManagement.cannotDeleteSelf'));
      return;
    }

    const confirmMsg = t('userManagement.deleteUserConfirm').replace('{username}', user.username);
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingUserId(user.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.deleteUser(user.id);
      if (res.success) {
        setSuccess(t('userManagement.userDeleted'));
        await loadUsers();
      } else {
        setError(res.message || 'Kullanıcı silinemedi.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Silme işlemi sırasında hata oluştu.');
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Eylem Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-[#e5e7eb]">{t('userManagement.usersList')}</h4>
          <p className="text-xs text-[#9ca3af] mt-0.5">{t('userManagement.usersListSubtitle')}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="p-2 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] text-[#9ca3af] hover:text-[#e5e7eb] transition-colors cursor-pointer disabled:opacity-50"
            title={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('userManagement.addUser')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Kullanıcı Listesi */}
      <div className="rounded-2xl bg-[#1a1d29] border border-[#2a2e3f] overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9ca3af] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <span>{t('common.loading')}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9ca3af]">
            Kayıtlı ek kullanıcı bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-[#2a2e3f]">
            {users.map((u) => {
              const isCurrent = u.username.toLowerCase() === currentUsername.toLowerCase();
              const isAdmin = u.role.toLowerCase() === 'admin';

              return (
                <div
                  key={u.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[#1f2333]/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#e5e7eb] truncate">{u.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono font-medium">
                            sen
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9ca3af] font-mono mt-0.5">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg border ${
                        isAdmin
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>{isAdmin ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}</span>
                    </span>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingUserId === u.id}
                        title={t('userManagement.deleteUser')}
                        className="p-2 text-[#9ca3af] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-500/20 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadUsers}
      />
    </div>
  );
};
