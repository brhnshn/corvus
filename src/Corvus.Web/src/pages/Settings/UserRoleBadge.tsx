import React from 'react';
import { Shield, ShieldAlert, Eye } from 'lucide-react';
import { useI18n } from '../../i18n';

interface UserRoleBadgeProps {
  role: string;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role }) => {
  const { t } = useI18n();

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
