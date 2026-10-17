import React from 'react';
import { Globe, Lock, Database, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { Button } from '../../components/ui/Button';

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
    <div className="card p-5 sm:p-7 space-y-6">
      {/* Dil Seçimi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-[var(--text-primary)]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.languageSectionTitle')}</h2>
            <p className="text-xs text-[var(--text-secondary)]">{t('settings.languageSectionDesc')}</p>
          </div>
        </div>
        <LanguageSwitch variant="full" />
      </div>

      {/* Kullanıcı Kayıtları (Açık/Kapalı) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border-hairline)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-[var(--text-primary)]" />
            </span>
            <div>
              <h2>{t('settings.userRegistration')}</h2>
              <p className="text-xs text-[var(--text-secondary)] font-normal max-w-lg leading-relaxed mt-0.5">
                {t('settings.regDesc')}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={togglingReg}
          onClick={onToggleRegistration}
          className={`self-start sm:self-auto px-3.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
            isRegistrationOpen
              ? 'bg-[var(--status-up-bg)] text-[var(--status-up)] border-[var(--status-up)]/30 hover:brightness-110'
              : 'bg-[var(--status-down-bg)] text-[var(--status-down)] border-[var(--status-down)]/30 hover:brightness-110'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isRegistrationOpen ? 'bg-[var(--status-up)]' : 'bg-[var(--status-down)]'}`} />
          <span>{isRegistrationOpen ? t('settings.registrationOpen') : t('settings.registrationClosed')}</span>
        </button>
      </div>

      {/* Veri Saklama Süresi (Retention Days) */}
      <div className="space-y-3 pb-5 border-b border-[var(--border-hairline)]">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-[var(--text-primary)]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.retentionPeriod')}</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {t('settings.retentionDesc')}
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
              className={`p-2.5 rounded-[var(--radius-sm)] border text-xs font-semibold font-mono transition-all text-center cursor-pointer ${
                !isCustomDays && settings['retention_days'] === days
                  ? 'bg-[var(--cloud-200)] text-[var(--bg-canvas)] border-[var(--cloud-200)]'
                  : 'bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              {days} {t('common.days')}
            </button>
          ))}
        </div>

        {dbStats && (
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] pt-1">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--status-up)]" />
            <span>{t('settings.currentDbSize')} <strong className="text-[var(--text-primary)] tabular-nums">{dbStats.formattedSize}</strong></span>
          </div>
        )}
      </div>

      {/* Inbound Deploy Webhook (CI/CD Otomasyonu) */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-[var(--text-primary)]" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.deployWebhookTitle')}</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {t('settings.deployWebhookDesc')}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const generated = Array.from(crypto.getRandomValues(new Uint8Array(24)))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
              setSettings(prev => ({ ...prev, deploy_webhook_token: generated }));
            }}
          >
            {t('settings.generateNewToken')}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-mono text-[var(--text-secondary)] block">
            {t('settings.webhookTokenLabel')}
          </label>
          <input
            type="text"
            value={settings['deploy_webhook_token'] || ''}
            onChange={(e) => setSettings(prev => ({ ...prev, deploy_webhook_token: e.target.value }))}
            placeholder={t('settings.deployTokenPlaceholder')}
            className="input w-full font-mono text-xs"
          />
          <p className="text-[11px] text-[var(--text-muted)] font-mono leading-relaxed">
            {t('common.usage')} <code className="text-[var(--cloud-200)]">POST /api/hooks/deploy/{'{token}'}?projectName=stack-adi</code>
          </p>
        </div>
      </div>
    </div>
  );
};
