import React from 'react';
import { Globe, Lock, Database, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';

interface GeneralSettingsTabProps {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dbStats: { formattedSize: string; sizeBytes: number } | null;
  isRegistrationOpen: boolean;
  togglingReg: boolean;
  onToggleRegistration: () => void;
  isCustomDays: boolean;
  setIsCustomDays: (val: boolean) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  settings,
  setSettings,
  dbStats,
  isRegistrationOpen,
  togglingReg,
  onToggleRegistration,
  isCustomDays,
  setIsCustomDays
}) => {
  const { t } = useI18n();

  return (
    <div className="p-4 sm:p-6 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-5">
      {/* Dil Seçimi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2e3f]/60">
        <div className="flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-[#d4d4d8]" />
          <div>
            <h2 className="text-sm font-semibold text-[#e5e7eb]">{t('settings.languageSectionTitle')}</h2>
            <p className="text-xs text-[#9ca3af]">{t('settings.languageSectionDesc')}</p>
          </div>
        </div>
        <LanguageSwitch variant="full" />
      </div>

      {/* Kullanıcı Kayıtları (Açık/Kapalı) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2e3f]/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#e5e7eb]">
            <Lock className="w-4 h-4 text-[#d4d4d8]" />
            <h2>{t('settings.userRegistration')}</h2>
          </div>
          <p className="text-xs text-[#9ca3af] max-w-lg leading-relaxed">
            {t('settings.regDesc')}
          </p>
        </div>

        <button
          type="button"
          disabled={togglingReg}
          onClick={onToggleRegistration}
          className={`self-start sm:self-auto px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
            isRegistrationOpen
              ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/25'
              : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30 hover:bg-[#ef4444]/25'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isRegistrationOpen ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
          <span>{isRegistrationOpen ? t('settings.regOpenBtn') : t('settings.regClosedBtn')}</span>
        </button>
      </div>


      {/* Veri Saklama Süresi */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#e5e7eb] flex-wrap">
              <Database className="w-4 h-4 text-[#d4d4d8]" />
              <h2>{t('settings.retentionTitle')}</h2>
              {dbStats && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0f1117] border border-[#2a2e3f] text-xs font-mono text-[#9ca3af]">
                  <span>{t('settings.dbSize')}: <strong className="text-white">{dbStats.formattedSize}</strong></span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#9ca3af] max-w-lg">
              {t('settings.retentionDesc')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <select
              value={isCustomDays ? 'custom' : (settings['retention_days'] ?? '30')}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'custom') {
                  setIsCustomDays(true);
                } else {
                  setIsCustomDays(false);
                  setSettings({ ...settings, retention_days: val });
                }
              }}
              className="bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-1.5 text-xs text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8] cursor-pointer"
            >
              <option value="7">{t('settings.retentionPresets.d7')}</option>
              <option value="15">{t('settings.retentionPresets.d15')}</option>
              <option value="30">{t('settings.retentionPresets.d30')}</option>
              <option value="60">{t('settings.retentionPresets.d60')}</option>
              <option value="90">{t('settings.retentionPresets.d90')}</option>
              <option value="180">{t('settings.retentionPresets.d180')}</option>
              <option value="365">{t('settings.retentionPresets.d365')}</option>
              <option value="0">{t('settings.retentionPresets.unlimited')}</option>
              <option value="custom">{t('settings.retentionPresets.custom')}</option>
            </select>

            {isCustomDays && (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={settings['retention_days'] || ''}
                  onChange={(e) => setSettings({ ...settings, retention_days: e.target.value })}
                  placeholder="Gün"
                  className="w-20 bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-2.5 py-1.5 text-xs text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8] text-center font-mono"
                />
                <span className="text-xs text-[#9ca3af]">gün</span>
              </div>
            )}
          </div>
        </div>

        {/* Sınırsız Mod Risk Uyarısı */}
        {settings['retention_days'] === '0' && !isCustomDays && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="leading-relaxed">
              {t('settings.retentionUnlimitedWarning')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
