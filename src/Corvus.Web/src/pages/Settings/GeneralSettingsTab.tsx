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
    <div className="surface rounded-[22px] p-5 sm:p-6 space-y-6">
      {/* Dil Seçimi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-[#eceef6]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[#eceef6]">{t('settings.languageSectionTitle') || 'Sistem Dili'}</h2>
            <p className="text-xs text-[#9ba0b5]">{t('settings.languageSectionDesc') || 'Arayüzün varsayılan dilini belirleyin'}</p>
          </div>
        </div>
        <LanguageSwitch variant="full" />
      </div>

      {/* Kullanıcı Kayıtları (Açık/Kapalı) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[#eceef6]">
            <span className="w-9 h-9 rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-[#eceef6]" />
            </span>
            <div>
              <h2>{t('settings.userRegistration') || 'Kullanıcı Kayıtları'}</h2>
              <p className="text-xs text-[#9ba0b5] font-normal max-w-lg leading-relaxed mt-0.5">
                {t('settings.regDesc') || 'Giriş ekranında yeni kullanıcı oluşturma formunu açın veya kapatın'}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={togglingReg}
          onClick={onToggleRegistration}
          className={`self-start sm:self-auto px-4 py-2 rounded-[14px] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            isRegistrationOpen
              ? 'bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30 hover:bg-[#34d399]/25'
              : 'bg-[#f87171]/15 text-[#f87171] border border-[#f87171]/30 hover:bg-[#f87171]/25'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isRegistrationOpen ? 'bg-[#34d399]' : 'bg-[#f87171]'}`} />
          <span>{isRegistrationOpen ? 'Kayıtlar Açık' : 'Kayıtlar Kapalı'}</span>
        </button>
      </div>

      {/* Veri Saklama Süresi (Retention Days) */}
      <div className="space-y-3 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-[12px] bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-[#eceef6]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[#eceef6]">Veri Saklama Süresi</h2>
            <p className="text-xs text-[#9ba0b5]">
              Geçmiş metrik ve logların veritabanında saklanacağı süre
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {['7', '15', '30', '90'].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => {
                setIsCustomDays(false);
                setSettings(prev => ({ ...prev, retention_days: days }));
              }}
              className={`p-3 rounded-[14px] border text-xs font-semibold transition-all text-center cursor-pointer ${
                !isCustomDays && settings['retention_days'] === days
                  ? 'bg-[#d5d5dc] text-[#1b1d2a] border-[#d5d5dc] shadow-xs'
                  : 'bg-white/[0.04] border-white/10 text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08]'
              }`}
            >
              {days} Gün
            </button>
          ))}
        </div>

        {dbStats && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#9ba0b5] pt-1">
            <AlertCircle className="w-3.5 h-3.5 text-[#34d399]" />
            <span>Mevcut Veritabanı Boyutu: <strong className="text-[#eceef6]">{dbStats.formattedSize}</strong></span>
          </div>
        )}
      </div>

      {/* Inbound Deploy Webhook (CI/CD Otomasyonu) */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-[12px] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-indigo-400" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[#eceef6]">Inbound Deploy Webhook (CI/CD)</h2>
              <p className="text-xs text-[#9ba0b5]">
                GitHub Actions veya CI/CD boru hatlarından otomatik konteyner dağıtımını tetikleyin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const generated = Array.from(crypto.getRandomValues(new Uint8Array(24)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
              setSettings(prev => ({ ...prev, deploy_webhook_token: generated }));
            }}
            className="self-start sm:self-auto px-3 py-1.5 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] text-[#eceef6] border border-white/10 text-xs font-medium transition-colors cursor-pointer"
          >
            Yeni Belirteç Üret
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-[#9ba0b5] block">
            Gizli Webhook Belirteci (Token)
          </label>
          <input
            type="text"
            value={settings['deploy_webhook_token'] || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, deploy_webhook_token: e.target.value }))}
            placeholder="Örn: 9f8a7b6c5d4e3f2a1b0c..."
            className="w-full px-3.5 py-2.5 rounded-[14px] bg-white/[0.04] border border-white/10 font-mono text-xs text-[#eceef6] focus:outline-hidden focus:border-indigo-500/50"
          />
          <p className="text-[11px] text-[#9ba0b5] font-mono leading-relaxed">
            Kullanım: <code className="text-indigo-300">POST /api/hooks/deploy/{'{token}'}?projectName=stack-adi</code>
          </p>
        </div>
      </div>
    </div>
  );
};
