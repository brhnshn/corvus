import React from 'react';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { DiscordChannelPanel } from './notifications/DiscordChannelPanel';
import { TelegramChannelPanel } from './notifications/TelegramChannelPanel';
import { NtfyChannelPanel } from './notifications/NtfyChannelPanel';
import { WebhookChannelPanel } from './notifications/WebhookChannelPanel';
import { SlackChannelPanel } from './notifications/SlackChannelPanel';
import { EmailChannelPanel } from './notifications/EmailChannelPanel';
import { NotificationEventFilters } from './notifications/NotificationEventFilters';
import { FlappingProtectionCard } from './notifications/FlappingProtectionCard';

export type ChannelType = 'discord' | 'telegram' | 'ntfy' | 'slack' | 'email' | 'webhook';

interface NotificationSettingsTabProps {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  activeChannel: ChannelType;
  setActiveChannel: (channel: ChannelType) => void;
  testingChannel: string | null;
  testResult: { channel: string; success: boolean; message: string } | null;
  onTestNotification: (channel: string) => void;
}

export const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({
  settings,
  setSettings,
  activeChannel,
  setActiveChannel,
  testingChannel,
  testResult,
  onTestNotification
}) => {
  const { t } = useI18n();

  const channels: { id: ChannelType; name: string; enabled: boolean }[] = [
    { id: 'discord', name: t('settings.channelTabDiscord'), enabled: settings['notification_discord_enabled'] === 'true' },
    { id: 'telegram', name: t('settings.channelTabTelegram'), enabled: settings['notification_telegram_enabled'] === 'true' },
    { id: 'slack', name: t('settings.channelTabSlack'), enabled: settings['notification_slack_enabled'] === 'true' },
    { id: 'email', name: t('settings.channelTabEmail'), enabled: settings['notification_email_enabled'] === 'true' },
    { id: 'ntfy', name: t('settings.channelTabNtfy'), enabled: settings['notification_ntfy_enabled'] === 'true' },
    { id: 'webhook', name: t('settings.channelTabWebhook'), enabled: settings['notification_webhook_enabled'] === 'true' },
  ];

  return (
    <div className="p-4 sm:p-6 rounded-2xl surface border border-white/10 space-y-6">
      <div className="border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Bell className="w-4 h-4 text-white/70" />
          <h2>{t('settings.notificationsTitle')}</h2>
        </div>
        <p className="text-xs text-white/50 mt-1">
          {t('settings.notificationsDesc')}
        </p>
      </div>

      {/* Kanal Sekmeleri */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/10">
        {channels.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveChannel(ch.id)}
            className={`py-2 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeChannel === ch.id
                ? 'bg-white text-black font-semibold shadow-xs'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${ch.enabled ? (activeChannel === ch.id ? 'bg-black' : 'bg-emerald-400') : 'bg-white/20'}`} />
            <span>{ch.name}</span>
            {ch.enabled && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono hidden sm:inline ${
                activeChannel === ch.id ? 'bg-black/15 text-black' : 'bg-emerald-500/15 text-emerald-400'
              }`}>
                {t('settings.activeCheckbox')}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Test Sonuç Bildirimi */}
      {testResult && (
        <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
          testResult.success 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>[{testResult.channel.toUpperCase()}] {testResult.message}</span>
        </div>
      )}

      {/* Seçili Kanalın Ayar Paneli */}
      <div className="p-5 rounded-2xl surface border border-white/10 space-y-4">
        {activeChannel === 'discord' && (
          <DiscordChannelPanel
            settings={settings}
            setSettings={setSettings}
            testingChannel={testingChannel}
            onTestNotification={onTestNotification}
          />
        )}

        {activeChannel === 'telegram' && (
          <TelegramChannelPanel
            settings={settings}
            setSettings={setSettings}
            testingChannel={testingChannel}
            onTestNotification={onTestNotification}
          />
        )}

        {activeChannel === 'slack' && (
          <SlackChannelPanel
            settings={settings}
            setSettings={setSettings}
            testingChannel={testingChannel}
            onTestNotification={onTestNotification}
          />
        )}

        {activeChannel === 'email' && (
          <EmailChannelPanel
            settings={settings}
            setSettings={setSettings}
            testingChannel={testingChannel}
            onTestNotification={onTestNotification}
          />
        )}

        {activeChannel === 'ntfy' && (
          <NtfyChannelPanel
            settings={settings}
            setSettings={setSettings}
            testingChannel={testingChannel}
            onTestNotification={onTestNotification}
          />
        )}

        {activeChannel === 'webhook' && (
          <WebhookChannelPanel
            settings={settings}
            setSettings={setSettings}
            testingChannel={testingChannel}
            onTestNotification={onTestNotification}
          />
        )}
      </div>

      {/* Bildirim Olay Filtreleri (Tetikleyiciler) */}
      <NotificationEventFilters
        settings={settings}
        setSettings={setSettings}
      />

      {/* Flapping (Dalgalanma) Koruması & Alarm Debounce */}
      <FlappingProtectionCard
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
};
