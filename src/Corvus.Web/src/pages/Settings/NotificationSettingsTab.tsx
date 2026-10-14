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
    <div className="card space-y-6">
      <div className="border-b border-[var(--border-hairline)] pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
          <h2>{t('settings.notificationsTitle')}</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {t('settings.notificationsDesc')}
        </p>
      </div>

      {/* Kanal Sekmeleri */}
      <div className="tabs overflow-x-auto no-scrollbar">
        {channels.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setActiveChannel(ch.id)}
            className={`tab ${activeChannel === ch.id ? 'active' : ''}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${ch.enabled ? 'bg-[var(--status-up)]' : 'bg-[var(--text-muted)]'}`} />
            <span>{ch.name}</span>
            {ch.enabled && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono hidden sm:inline ${
                activeChannel === ch.id ? 'bg-black/15 text-current' : 'bg-[var(--status-up-bg)] text-[var(--status-up)]'
              }`}>
                {t('settings.activeCheckbox')}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Test Sonuç Bildirimi */}
      {testResult && (
        <div className={`p-3.5 rounded-[var(--radius-md)] border text-xs flex items-center gap-2.5 ${
          testResult.success 
            ? 'bg-[var(--status-up-bg)] border-[var(--status-up)]/30 text-[var(--status-up)]' 
            : 'bg-[var(--status-down-bg)] border-[var(--status-down)]/30 text-[var(--status-down)]'
        }`}>
          {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>[{testResult.channel.toUpperCase()}] {testResult.message}</span>
        </div>
      )}

      {/* Seçili Kanalın Ayar Paneli */}
      <div className="card bg-[var(--bg-subtle)] space-y-4">
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
