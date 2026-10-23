import React from 'react';
import { UserPlus, AlertCircle, RefreshCw, Lock, User as UserIcon } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { NewUserRole } from './useUsersTab';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  modalError: string | null;
  username: string;
  onChangeUsername: (value: string) => void;
  password: string;
  onChangePassword: (value: string) => void;
  role: NewUserRole;
  onChangeRole: (value: NewUserRole) => void;
  creating: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  modalError,
  username,
  onChangeUsername,
  password,
  onChangePassword,
  role,
  onChangeRole,
  creating
}) => {
  const { t } = useI18n();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.addUserBtn')}
      subtitle={t('settings.usersSectionDesc')}
      icon={<UserPlus className="w-5 h-5 text-[var(--cloud-100)]" />}
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
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
              value={username}
              onChange={(e) => onChangeUsername(e.target.value)}
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
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
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
            value={role}
            onChange={(e) => onChangeRole(e.target.value as NewUserRole)}
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
            onClick={onClose}
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
  );
};
