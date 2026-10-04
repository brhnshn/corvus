import React, { useState, useEffect } from 'react';
import { UserPlus, User as UserIcon, Shield, Trash2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import type { UserDto } from '../../types';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
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
      setError(t('userManagement.cannotDeleteSelf') || 'Kendi kullanıcınızı silemezsiniz.');
      return;
    }

    const confirmMsg = (t('userManagement.deleteUserConfirm') || '{username} kullanıcısını silmek istediğinize emin misiniz?').replace('{username}', user.username);
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setDeletingUserId(user.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.deleteUser(user.id);
      if (res.success) {
        setSuccess(t('userManagement.userDeleted') || 'Kullanıcı silindi.');
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
    <div className="space-y-4">
      {/* Üst Eylem Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#eceef6]">
            {t('userManagement.usersList') || 'Kullanıcı Listesi'}
          </h4>
          <p className="text-xs text-[#9ba0b5] mt-0.5">
            {t('userManagement.usersListSubtitle') || 'Sisteme erişebilen aktif hesaplar'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            {t('common.refresh') || 'Yenile'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            {t('userManagement.addUser') || 'Kullanıcı Ekle'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-[14px] bg-[#f87171]/15 border border-[#f87171]/30 text-[#f87171] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-[14px] bg-[#34d399]/15 border border-[#34d399]/30 text-[#34d399] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Kullanıcı Listesi */}
      <div className="surface rounded-[22px] overflow-hidden border border-white/10">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9ba0b5] flex items-center justify-center gap-2 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-[#d5d5dc]" />
            <span>{t('common.loading') || 'Yükleniyor...'}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9ba0b5]">
            Kayıtlı ek kullanıcı bulunmuyor.
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {users.map((u) => {
              const isCurrent = u.username.toLowerCase() === currentUsername.toLowerCase();
              const isAdmin = u.role.toLowerCase() === 'admin';

              return (
                <div
                  key={u.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[12px] bg-white/[0.07] border border-white/10 text-[#eceef6] flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-[#d5d5dc]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#eceef6] truncate">{u.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] bg-white/10 text-[#eceef6] font-mono font-medium">
                            sen
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9ba0b5] font-mono mt-0.5">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-[10px] border ${
                        isAdmin
                          ? 'bg-[#34d399]/15 border-[#34d399]/30 text-[#34d399]'
                          : 'bg-white/[0.06] border-white/10 text-[#9ba0b5]'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>{isAdmin ? (t('userManagement.roleAdmin') || 'Yönetici') : (t('userManagement.roleViewer') || 'İzleyici')}</span>
                    </span>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingUserId === u.id}
                        title={t('userManagement.deleteUser') || 'Kullanıcıyı Sil'}
                        className="p-2 text-[#9ba0b5] hover:text-[#f87171] hover:bg-[#f87171]/15 rounded-[10px] transition-colors cursor-pointer border border-transparent hover:border-[#f87171]/25 disabled:opacity-40"
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
