import React from 'react';
import { UserCheck, UserPlus, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { useUsersTab } from './useUsersTab';
import { UsersTable } from './UsersTable';
import { RoleDescriptionsGrid } from './RoleDescriptionsGrid';
import { CreateUserModal } from './CreateUserModal';

interface UsersTabProps {
  currentUsername?: string | null;
  currentUserRole?: string | null;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  currentUsername,
  currentUserRole = 'admin'
}) => {
  const { t } = useI18n();
  const isAdmin = currentUserRole === 'admin';
  const {
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
  } = useUsersTab({ currentUsername, isAdmin });

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
      <UsersTable
        users={users}
        loading={loading}
        isAdmin={isAdmin}
        currentUsername={currentUsername}
        onRoleChange={handleRoleChange}
        onDeleteUser={handleDeleteUser}
      />

      {/* Rol Açıklamaları Kutusu */}
      <RoleDescriptionsGrid />

      {/* Yeni Kullanıcı Ekleme Modalı */}
      <CreateUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateUser}
        modalError={modalError}
        username={newUsername}
        onChangeUsername={setNewUsername}
        password={newPassword}
        onChangePassword={setNewPassword}
        role={newRole}
        onChangeRole={setNewRole}
        creating={creating}
      />
    </div>
  );
};
