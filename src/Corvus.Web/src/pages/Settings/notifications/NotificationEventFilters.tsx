import React from 'react';
import { useI18n } from '../../../i18n';

interface NotificationEventFiltersProps {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const NotificationEventFilters: React.FC<NotificationEventFiltersProps> = ({
  settings,
  setSettings
}) => {
  const { t } = useI18n();

  return (
    <div className="pt-3 border-t border-white/10 space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-white">{t('settings.eventsTitle')}</h3>
        <p className="text-[11px] text-white/50">{t('settings.eventsDesc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer text-xs text-white/90 hover:bg-white/[0.06] hover:border-white/20 transition-all">
          <input
            type="checkbox"
            checked={settings['notify_service_events'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_service_events: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span>{t('settings.eventServiceOutages')}</span>
        </label>

        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer text-xs text-white/90 hover:bg-white/[0.06] hover:border-white/20 transition-all">
          <input
            type="checkbox"
            checked={settings['notify_ssl_expiry'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_ssl_expiry: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span>{t('settings.eventSslExpiry')}</span>
        </label>

        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer text-xs text-white/90 hover:bg-white/[0.06] hover:border-white/20 transition-all">
          <input
            type="checkbox"
            checked={settings['notify_flapping_events'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_flapping_events: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span>{t('settings.eventFlapping')}</span>
        </label>

        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer text-xs text-white/90 hover:bg-white/[0.06] hover:border-white/20 transition-all">
          <input
            type="checkbox"
            checked={settings['notify_system_alerts'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_system_alerts: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span>{t('settings.eventSystemResources')}</span>
        </label>

        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer text-xs text-white/90 hover:bg-white/[0.06] hover:border-white/20 transition-all">
          <input
            type="checkbox"
            checked={settings['notify_backup_events'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_backup_events: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span>{t('settings.eventBackupAlerts')}</span>
        </label>
      </div>
    </div>
  );
};
