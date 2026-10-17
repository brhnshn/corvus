import React, { useEffect, useState, useCallback } from 'react';
import { 
  UserCheck, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldAlert, 
  Eye, 
  AlertCircle,
  RefreshCw,
  Lock,
  User as UserIcon
} from 'lucide-react';
import { api } from '../../api/client';
import type { UserDto } from '../../types';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface UsersTabProps {
  currentUsername?: string | null;
  currentUserRole?: string | null;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  currentUsername,
  currentUserRole = 'admin'
}) => {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'operator' | 'viewer'>('viewer');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'admin';

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('userManagement.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (userId: string, targetRole: string) => {
    if (!isAdmin) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await api.updateUserRole(userId, targetRole);
      setSuccessMsg(t('settings.userRoleUpdatedToast'));
      await loadUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('userManagement.roleUpdateFailed'));
    }
  };

  const handleDeleteUser = async (user: UserDto) => {
    if (!isAdmin) return;
    if (user.username === currentUsername) {
      setError(t('userManagement.cannotDeleteSelf'));
      return;
    }
    if (!window.confirm(t('settings.deleteUserConfirm'))) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    try {
      await api.deleteUser(user.id);
      setSuccessMsg(t('settings.userDeletedToast'));
      await loadUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('userManagement.deleteFailed'));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (newUsername.trim().length < 3) {
      setModalError(t('auth.usernameTooShort'));
      return;
    }
    if (newPassword.length < 4) {
      setModalError(t('auth.passwordTooShort'));
      return;
    }

    setCreating(true);
    setModalError(null);
    try {
      await api.createUser({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole
      });
      setIsAddModalOpen(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('viewer');
      setSuccessMsg(t('settings.userCreatedToast'));
      await loadUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : t('userManagement.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-mono font-medium bg-[var(--bg-active)] text-[var(--cloud-100)] border border-[var(--border-hairline)]">
            <Shield className="w-3 h-3 text-[var(--cloud-200)]" />
            <span>{t('settings.roleAdmin')}</span>
          </span>
        );
      case 'operator':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-mono font-medium bg-[var(--status-warn-bg)] text-[var(--status-warn)] border border-[rgba(229,169,60,0.25)]">
            <ShieldAlert className="w-3 h-3" />
            <span>{t('settings.roleOperator')}</span>
          </span>
        );
      case 'viewer':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm)] text-[11px] font-mono font-medium bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
            <Eye className="w-3 h-3" />
            <span>{t('settings.roleViewer')}</span>
          </span>
        );
    }
  };

  return (
    <div className="card p-5 sm:p-7 space-y-6">
      {/* Üst Bilgi ve Aksiyon Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-[var(--text-primary)]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('settings.usersSectionTitle')}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {t('settings.usersSectionDesc')}
            </p>
          </div>
        </div>

        {isAdmin && (
          <Button
            variant="cloud"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            <span>{t('settings.addUserBtn')}</span>
          </Button>
        )}
      </div>

      {/* Bildirim / Hata Mesajları */}
      {error && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[rgba(229,83,75,0.3)] text-[var(--status-down)] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-up-bg)] border border-[rgba(52,211,153,0.3)] text-[var(--status-up)] text-xs flex items-center gap-2">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Kullanıcı Listesi Tablosu */}
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-canvas)]">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium">
              <th className="py-2.5 px-3.5">{t('settings.colUsername')}</th>
              <th className="py-2.5 px-3.5">{t('settings.colRole')}</th>
              <th className="py-2.5 px-3.5">{t('settings.colCreatedAt')}</th>
              <th className="py-2.5 px-3.5 text-right">{t('settings.colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)] text-[var(--text-primary)]">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--cloud-300)]" />
                  <span className="font-mono text-xs">{t('common.loading')}</span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[var(--text-muted)] font-mono text-xs">
                  {t('userManagement.noUsers')}
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.username === currentUsername;
                return (
                  <tr key={u.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    {/* Kullanıcı Adı */}
                    <td className="py-3 px-3.5 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[var(--bg-active)] border border-[var(--border-hairline)] flex items-center justify-center text-[10px] text-[var(--cloud-100)] font-mono uppercase">
                          {u.username.slice(0, 2)}
                        </span>
                        <span className="text-[var(--cloud-100)] font-semibold">{u.username}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--bg-active)] text-[var(--text-secondary)] font-mono">
                            {t('userManagement.you')}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Rol Seçici / Rozet */}
                    <td className="py-3 px-3.5">
                      {isAdmin && !isSelf ? (
                        <select
                          value={u.role.toLowerCase()}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--cloud-300)] font-mono cursor-pointer"
                        >
                          <option value="admin">{t('settings.roleAdmin')}</option>
                          <option value="operator">{t('settings.roleOperator')}</option>
                          <option value="viewer">{t('settings.roleViewer')}</option>
                        </select>
                      ) : (
                        getRoleBadge(u.role)
                      )}
                    </td>

                    {/* Kayıt Tarihi */}
                    <td className="py-3 px-3.5 text-[var(--text-secondary)] font-mono tabular-nums text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}
                    </td>

                    {/* İşlemler */}
                    <td className="py-3 px-3.5 text-right">
                      {isAdmin && (
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleDeleteUser(u)}
                          className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                            isSelf
                              ? 'text-[var(--text-muted)] opacity-30 cursor-not-allowed'
                              : 'text-[var(--text-muted)] hover:text-[var(--status-down)] hover:bg-[var(--status-down-bg)] cursor-pointer'
                          }`}
                          title={isSelf ? t('userManagement.cannotDeleteSelf') : t('userManagement.deleteUser')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rol Açıklamaları Kutusu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--cloud-100)]">
            <Shield className="w-3.5 h-3.5 text-[var(--cloud-200)]" />
            <span>{t('settings.roleAdmin')}</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {t('settings.roleAdminDesc')}
          </p>
        </div>

        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--status-warn)]">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{t('settings.roleOperator')}</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {t('settings.roleOperatorDesc')}
          </p>
        </div>

        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-secondary)]">
            <Eye className="w-3.5 h-3.5" />
            <span>{t('settings.roleViewer')}</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {t('settings.roleViewerDesc')}
          </p>
        </div>
      </div>

      {/* Yeni Kullanıcı Ekleme Modalı */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('settings.addUserBtn')}
        subtitle={t('settings.usersSectionDesc')}
        icon={<UserPlus className="w-5 h-5 text-[var(--cloud-100)]" />}
      >
        <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
          {modalError && (
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[rgba(229,83,75,0.3)] text-[var(--status-down)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-primary)]">
              {t('auth.usernameLabel')}
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={t('userManagement.usernameExample')}
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cloud-300)] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-primary)]">
              {t('auth.passwordLabel')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--cloud-300)] font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-primary)]">
              {t('settings.colRole')}
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'operator' | 'viewer')}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--cloud-300)] font-mono cursor-pointer"
            >
              <option value="viewer">{t('settings.roleViewer')} - {t('settings.roleViewerDesc')}</option>
              <option value="operator">{t('settings.roleOperator')} - {t('settings.roleOperatorDesc')}</option>
              <option value="admin">{t('settings.roleAdmin')} - {t('settings.roleAdminDesc')}</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-hairline)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              <span>{t('common.cancel')}</span>
            </Button>
            <Button
              type="submit"
              variant="cloud"
              size="sm"
              disabled={creating}
              icon={creating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            >
              <span>{creating ? t('common.loading') : t('settings.addUserBtn')}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
