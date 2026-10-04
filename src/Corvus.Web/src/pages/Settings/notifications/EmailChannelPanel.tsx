import React, { useState } from 'react';
import { Send, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { EmailRecipientInput } from '../../../components/EmailRecipientInput';

interface EmailChannelPanelProps {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  testingChannel: string | null;
  onTestNotification: (channel: string) => void;
}

export const EmailChannelPanel: React.FC<EmailChannelPanelProps> = ({
  settings,
  setSettings,
  testingChannel,
  onTestNotification
}) => {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);

  const isEnabled = settings['notification_email_enabled'] === 'true';

  return (
    <div className="space-y-4">
      {/* Başlık ve Aktiflik */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-white/70" />
          <span className="text-xs font-semibold text-white">{t('settings.smtpEmailTitle')}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setSettings({ ...settings, notification_email_enabled: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span className="text-xs text-white/50">{t('settings.channelEnabledLabel')}</span>
        </label>
      </div>

      {/* Sunucu & Port */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('settings.smtpHostLabel')}
          </label>
          <input
            type="text"
            placeholder="smtp.gmail.com / smtp.resend.com"
            value={settings['smtp_host'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('settings.smtpPortLabel')}
          </label>
          <input
            type="number"
            placeholder="587"
            value={settings['smtp_port'] || '587'}
            onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      {/* Kimlik Doğrulama: Kullanıcı Adı ve Şifre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('settings.smtpUserLabel')}
          </label>
          <input
            type="text"
            placeholder="alerts@company.com"
            value={settings['smtp_user'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('settings.smtpPassLabel')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={settings['smtp_pass'] || ''}
              onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-0.5 cursor-pointer"
              title={showPassword ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* TLS / SSL Güvenlik Seçeneği */}
      <div className="pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
          <input
            type="checkbox"
            checked={settings['smtp_tls'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, smtp_tls: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded-sm accent-white cursor-pointer"
          />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('settings.smtpTlsLabel')}</span>
          </span>
        </label>
      </div>

      {/* Gönderen Bilgileri */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('settings.smtpFromLabel')}
          </label>
          <input
            type="email"
            placeholder="noreply@company.com"
            value={settings['smtp_from'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('settings.smtpFromNameLabel')}
          </label>
          <input
            type="text"
            placeholder="Corvus Monitoring"
            value={settings['smtp_from_name'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>
      </div>

      {/* Alıcılar (Pills / Etiketler) */}
      <div className="pt-2 border-t border-white/10">
        <label className="block text-xs font-medium text-white/60 mb-1">
          {t('settings.smtpToLabel')}
        </label>
        <EmailRecipientInput
          value={settings['smtp_to'] || ''}
          onChange={(newVal) => setSettings({ ...settings, smtp_to: newVal })}
          placeholder="devops@company.com (Enter tuşuna basın)"
        />
      </div>

      {/* Test Butonu */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={testingChannel === 'email' || !settings['smtp_host'] || !settings['smtp_from'] || !settings['smtp_to']}
          onClick={() => onTestNotification('email')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
        >
          <Send className={`w-3 h-3 ${testingChannel === 'email' ? 'animate-spin' : ''}`} />
          <span>{testingChannel === 'email' ? t('settings.testingBtn') : t('settings.testBtn', { channel: 'SMTP E-Posta' })}</span>
        </button>
      </div>
    </div>
  );
};
