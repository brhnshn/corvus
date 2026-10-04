import React from 'react';
import { Activity } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface FlappingProtectionCardProps {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const FlappingProtectionCard: React.FC<FlappingProtectionCardProps> = ({
  settings,
  setSettings
}) => {
  const { t } = useI18n();

  const isEnabled = settings['flapping_protection_enabled'] !== 'false';
  const threshold = settings['flapping_threshold'] || '4';
  const windowMinutes = settings['flapping_window_minutes'] || '10';
  const recoveryChecks = settings['flapping_recovery_checks'] || '3';

  return (
    <div className="pt-3 border-t border-white/10 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>{t('settings.flappingTitle')}</span>
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Debounce & Anti-Spam
              </span>
            </h3>
            <p className="text-[11px] text-white/50">{t('settings.flappingDesc')}</p>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer self-start sm:self-center">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setSettings({ ...settings, flapping_protection_enabled: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span className="text-xs font-medium text-white/80">{t('settings.flappingEnableToggle')}</span>
        </label>
      </div>

      {isEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          {/* Durum Geçiş Eşiği */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              {t('settings.flappingThresholdLabel')}
            </label>
            <select
              value={threshold}
              onChange={(e) => setSettings({ ...settings, flapping_threshold: e.target.value })}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="3">3 {t('settings.flappingTransitionsUnit')}</option>
              <option value="4">4 {t('settings.flappingTransitionsUnit')} ({t('settings.recommended')})</option>
              <option value="5">5 {t('settings.flappingTransitionsUnit')}</option>
              <option value="6">6 {t('settings.flappingTransitionsUnit')}</option>
              <option value="8">8 {t('settings.flappingTransitionsUnit')}</option>
            </select>
            <p className="text-[10px] text-white/40 mt-1">
              {t('settings.flappingThresholdHelp')}
            </p>
          </div>

          {/* Kayan Zaman Penceresi */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              {t('settings.flappingWindowLabel')}
            </label>
            <select
              value={windowMinutes}
              onChange={(e) => setSettings({ ...settings, flapping_window_minutes: e.target.value })}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="5">5 {t('settings.minutesUnit')}</option>
              <option value="10">10 {t('settings.minutesUnit')} ({t('settings.recommended')})</option>
              <option value="15">15 {t('settings.minutesUnit')}</option>
              <option value="30">30 {t('settings.minutesUnit')}</option>
            </select>
            <p className="text-[10px] text-white/40 mt-1">
              {t('settings.flappingWindowHelp')}
            </p>
          </div>

          {/* Kararlılık / İyileşme Kontrol Sayısı */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              {t('settings.flappingRecoveryLabel')}
            </label>
            <select
              value={recoveryChecks}
              onChange={(e) => setSettings({ ...settings, flapping_recovery_checks: e.target.value })}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="2">2 {t('settings.checksUnit')}</option>
              <option value="3">3 {t('settings.checksUnit')} ({t('settings.recommended')})</option>
              <option value="5">5 {t('settings.checksUnit')}</option>
            </select>
            <p className="text-[10px] text-white/40 mt-1">
              {t('settings.flappingRecoveryHelp')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
