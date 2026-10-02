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
    <div className="pt-2 border-t border-[#2a2e3f]/60 space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-[#e5e7eb]">{t('settings.eventsTitle')}</h3>
        <p className="text-[11px] text-[#9ca3af]">{t('settings.eventsDesc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f] cursor-pointer text-xs text-[#e5e7eb] hover:border-[#3f4458] transition-colors">
          <input
            type="checkbox"
            checked={settings['notify_service_events'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_service_events: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-[#d4d4d8] cursor-pointer"
          />
          <span>{t('settings.eventServiceOutages')}</span>
        </label>

        <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f] cursor-pointer text-xs text-[#e5e7eb] hover:border-[#3f4458] transition-colors">
          <input
            type="checkbox"
            checked={settings['notify_ssl_expiry'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_ssl_expiry: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-[#d4d4d8] cursor-pointer"
          />
          <span>{t('settings.eventSslExpiry')}</span>
        </label>

        <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f] cursor-pointer text-xs text-[#e5e7eb] hover:border-[#3f4458] transition-colors">
          <input
            type="checkbox"
            checked={settings['notify_flapping_events'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_flapping_events: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
          />
          <span>{t('settings.eventFlapping')}</span>
        </label>

        <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f] cursor-pointer text-xs text-[#e5e7eb] hover:border-[#3f4458] transition-colors">
          <input
            type="checkbox"
            checked={settings['notify_system_alerts'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_system_alerts: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-[#d4d4d8] cursor-pointer"
          />
          <span>{t('settings.eventSystemResources')}</span>
        </label>

        <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f] cursor-pointer text-xs text-[#e5e7eb] hover:border-[#3f4458] transition-colors">
          <input
            type="checkbox"
            checked={settings['notify_backup_events'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, notify_backup_events: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-[#d4d4d8] cursor-pointer"
          />
          <span>{t('settings.eventBackupAlerts')}</span>
        </label>
      </div>
    </div>
  );
};
