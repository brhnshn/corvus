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
      <div className="flex items-center justify-between border-b border-[#2a2e3f] pb-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-[#e5e7eb]">{t('settings.smtpEmailTitle')}</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setSettings({ ...settings, notification_email_enabled: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
          />
          <span className="text-xs text-[#9ca3af]">{t('settings.channelEnabledLabel')}</span>
        </label>
      </div>

      {/* Sunucu & Port */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[#9ca3af] mb-1">
            {t('settings.smtpHostLabel')}
          </label>
          <input
            type="text"
            placeholder="smtp.gmail.com / smtp.resend.com"
            value={settings['smtp_host'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
            className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1">
            {t('settings.smtpPortLabel')}
          </label>
          <input
            type="number"
            placeholder="587"
            value={settings['smtp_port'] || '587'}
            onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
            className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Kimlik Doğrulama: Kullanıcı Adı ve Şifre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1">
            {t('settings.smtpUserLabel')}
          </label>
          <input
            type="text"
            placeholder="alerts@company.com"
            value={settings['smtp_user'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
            className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1">
            {t('settings.smtpPassLabel')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={settings['smtp_pass'] || ''}
              onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
              className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] font-mono focus:outline-none focus:border-indigo-500 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-0.5 cursor-pointer"
              title={showPassword ? t('settings.hidePassword') : t('settings.showPassword')}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* TLS / SSL Güvenlik Seçeneği */}
      <div className="pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
          <input
            type="checkbox"
            checked={settings['smtp_tls'] !== 'false'}
            onChange={(e) => setSettings({ ...settings, smtp_tls: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded-sm bg-[#1a1d29] border-[#2a2e3f] text-indigo-500 focus:ring-0"
          />
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('settings.smtpTlsLabel')}</span>
          </span>
        </label>
      </div>

      {/* Gönderen Bilgileri */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#2a2e3f]/60">
        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1">
            {t('settings.smtpFromLabel')}
          </label>
          <input
            type="email"
            placeholder="noreply@company.com"
            value={settings['smtp_from'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
            className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9ca3af] mb-1">
            {t('settings.smtpFromNameLabel')}
          </label>
          <input
            type="text"
            placeholder="Corvus Monitoring"
            value={settings['smtp_from_name'] || ''}
            onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
            className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Alıcılar (Pills / Etiketler) */}
      <div className="pt-1 border-t border-[#2a2e3f]/60">
        <label className="block text-xs font-medium text-[#9ca3af] mb-1">
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2e3f] bg-[#1a1d29] text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130] transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
        >
          <Send className={`w-3 h-3 ${testingChannel === 'email' ? 'animate-spin' : ''}`} />
          <span>{testingChannel === 'email' ? t('settings.testingBtn') : t('settings.testBtn', { channel: 'SMTP E-Posta' })}</span>
        </button>
      </div>
    </div>
  );
};
