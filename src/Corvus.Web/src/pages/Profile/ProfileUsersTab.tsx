import React, { useState, useCallback } from 'react';
import { UserPlus, User as UserIcon, Shield, Trash2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import type { UserDto } from '../../types';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { AddUserModal } from './AddUserModal';
import { useLoadEffect } from '../../hooks/useLoadEffect';

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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('userManagement.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useLoadEffect(loadUsers);

  const handleDeleteUser = async (user: UserDto) => {
    if (user.username.toLowerCase() === currentUsername.toLowerCase()) {
      setError(t('userManagement.cannotDeleteSelf'));
      return;
    }

    const confirmMsg = t('userManagement.deleteUserConfirm', { username: user.username });
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
        setError(res.message || t('userManagement.deleteFailed'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('userManagement.deleteFailed'));
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Üst Eylem Çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {t('userManagement.usersList')}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {t('userManagement.usersListSubtitle')}
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
            {t('common.refresh')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            {t('userManagement.addUser')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-up-bg)] border border-[var(--status-up)]/30 text-[var(--status-up)] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Kullanıcı Listesi Kartı */}
      <div className="card overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--text-primary)]" />
            <span>{t('common.loading')}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)]">
            {t('userManagement.noUsers')}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-hairline)]">
            {users.map((u) => {
              const isCurrent = u.username.toLowerCase() === currentUsername.toLowerCase();
              const isAdmin = u.role.toLowerCase() === 'admin';

              return (
                <div
                  key={u.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)] font-mono font-medium">
                            {t('userManagement.you')}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className={isAdmin ? 'badge badge-up' : 'badge'}>
                      <Shield className="w-3 h-3" />
                      <span>{isAdmin ? t('userManagement.roleAdmin') : t('userManagement.roleViewer')}</span>
                    </span>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingUserId === u.id}
                        title={t('userManagement.deleteUser')}
                        className="btn btn-sm btn-ghost text-[var(--text-muted)] hover:text-[var(--status-down)] disabled:opacity-40"
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
