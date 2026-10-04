import React from 'react';
import { Send } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface SlackChannelPanelProps {
  settings: Record<string, string>;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  testingChannel: string | null;
  onTestNotification: (channel: string) => void;
}

export const SlackChannelPanel: React.FC<SlackChannelPanelProps> = ({
  settings,
  setSettings,
  testingChannel,
  onTestNotification
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">{t('settings.slackWebhook')}</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings['notification_slack_enabled'] === 'true'}
            onChange={(e) => setSettings({ ...settings, notification_slack_enabled: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-white cursor-pointer"
          />
          <span className="text-xs text-white/50">{t('settings.channelEnabledLabel')}</span>
        </label>
      </div>

      <input
        type="url"
        placeholder="https://hooks.slack.com/services/..."
        value={settings['notification_slack_webhook_url'] || ''}
        onChange={(e) => setSettings({ ...settings, notification_slack_webhook_url: e.target.value })}
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
      />

      <p className="text-[10px] text-white/40">
        {t('settings.slackWebhookHelp')}
      </p>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={testingChannel === 'slack' || !settings['notification_slack_webhook_url']}
          onClick={() => onTestNotification('slack')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Send className={`w-3 h-3 ${testingChannel === 'slack' ? 'animate-spin' : ''}`} />
          <span>{testingChannel === 'slack' ? t('settings.testingBtn') : t('settings.testBtn', { channel: 'Slack' })}</span>
        </button>
      </div>
    </div>
  );
};
