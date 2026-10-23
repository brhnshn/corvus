import React from 'react';
import { Shield, ShieldAlert, Eye } from 'lucide-react';
import { useI18n } from '../../i18n';

export const RoleDescriptionsGrid: React.FC = () => {
  const { t } = useI18n();

  return (
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
  );
};
