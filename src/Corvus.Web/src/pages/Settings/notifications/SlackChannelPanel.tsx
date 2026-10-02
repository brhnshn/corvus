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
        <span className="text-xs font-semibold text-[#e5e7eb]">{t('settings.slackWebhook')}</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings['notification_slack_enabled'] === 'true'}
            onChange={(e) => setSettings({ ...settings, notification_slack_enabled: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4 rounded accent-[#d4d4d8] cursor-pointer"
          />
          <span className="text-xs text-[#9ca3af]">{t('settings.channelEnabledLabel')}</span>
        </label>
      </div>

      <input
        type="url"
        placeholder="https://hooks.slack.com/services/..."
        value={settings['notification_slack_webhook_url'] || ''}
        onChange={(e) => setSettings({ ...settings, notification_slack_webhook_url: e.target.value })}
        className="w-full bg-[#1a1d29] border border-[#2a2e3f] rounded-lg px-3 py-2 text-xs text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8]"
      />

      <p className="text-[10px] text-[#9ca3af]/70">
        {t('settings.slackWebhookHelp')}
      </p>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={testingChannel === 'slack' || !settings['notification_slack_webhook_url']}
          onClick={() => onTestNotification('slack')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2e3f] bg-[#1a1d29] text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1e2130] transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Send className={`w-3 h-3 ${testingChannel === 'slack' ? 'animate-spin' : ''}`} />
          <span>{testingChannel === 'slack' ? t('settings.testingBtn') : t('settings.testBtn', { channel: 'Slack' })}</span>
        </button>
      </div>
    </div>
  );
};
