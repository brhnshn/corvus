import type React from 'react';
import { useState, useCallback } from 'react';
import { api } from '../../api/client';
import type { UserDto } from '../../types';
import { useI18n } from '../../i18n';
import { useLoadEffect } from '../../hooks/useLoadEffect';
import { isPasswordTooShort } from '../../utils/passwordPolicy';

export type NewUserRole = 'admin' | 'operator' | 'viewer';

interface UseUsersTabOptions {
  currentUsername?: string | null;
  isAdmin: boolean;
}

/** Kullanıcı listesini, rol/silme işlemlerini ve yeni kullanıcı oluşturma formunu yönetir. */
export const useUsersTab = ({ currentUsername, isAdmin }: UseUsersTabOptions) => {
  const { t } = useI18n();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<NewUserRole>('viewer');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

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

  useLoadEffect(loadUsers);

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
    if (isPasswordTooShort(newPassword)) {
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

  return {
    users,
    loading,
    error,
    successMsg,
    isAddModalOpen,
    setIsAddModalOpen,
    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    newRole,
    setNewRole,
    creating,
    modalError,
    handleRoleChange,
    handleDeleteUser,
    handleCreateUser
  };
};
