import React from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import type { UserDto } from '../../types';
import { useI18n } from '../../i18n';
import { UserRoleBadge } from './UserRoleBadge';

interface UsersTableProps {
  users: UserDto[];
  loading: boolean;
  isAdmin: boolean;
  currentUsername?: string | null;
  onRoleChange: (userId: string, targetRole: string) => void;
  onDeleteUser: (user: UserDto) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  isAdmin,
  currentUsername,
  onRoleChange,
  onDeleteUser
}) => {
  const { t } = useI18n();

  return (
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
                        onChange={(e) => onRoleChange(u.id, e.target.value)}
                        className="bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--cloud-300)] font-mono cursor-pointer"
                      >
                        <option value="admin">{t('settings.roleAdmin')}</option>
                        <option value="operator">{t('settings.roleOperator')}</option>
                        <option value="viewer">{t('settings.roleViewer')}</option>
                      </select>
                    ) : (
                      <UserRoleBadge role={u.role} />
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
                        onClick={() => onDeleteUser(u)}
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
  );
};
