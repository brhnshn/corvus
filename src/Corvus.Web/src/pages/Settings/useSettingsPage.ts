import { useEffect, useState } from 'react';
import type React from 'react';
import { api, type VersionInfo } from '../../api/client';
import { useI18n } from '../../i18n';
import type { ChannelType } from './NotificationSettingsTab';
import type { AlertRule } from '../../types';

export function useSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingReg, setTogglingReg] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('discord');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ channel: string; success: boolean; message: string } | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [copiedBackupCmd, setCopiedBackupCmd] = useState(false);
  const [dbStats, setDbStats] = useState<{ formattedSize: string; sizeBytes: number } | null>(null);
  const [isCustomDays, setIsCustomDays] = useState(false);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);

  const isRegistrationOpen = settings['registration_enabled'] !== 'false';

  const fetchAlertRules = () => {
    api.getAlertRules()
      .then(setAlertRules)
      .catch((err) => console.warn('[Settings] Alarm kuralları yüklenemedi:', err));
  };

  const fetchDbStats = () => {
    api.getDbStats()
      .then(data => { if (data) setDbStats(data); })
      .catch(() => {});
  };

  useEffect(() => {
    api.getSettings()
      .then((data) => {
        // Ayar hiç kaydedilmemişse backend varsayılanı (30 gün) seçili görünsün
        const days = data['retention_days'] || '30';
        setSettings({ ...data, retention_days: days });
        const known = ['7', '15', '30', '60', '90', '180', '365', '0'];
        if (!known.includes(days) && days !== '') {
          setIsCustomDays(true);
        }
      })
      .catch((err) => {
        console.warn('[Settings] Ayarlar yüklenemedi:', err);
      });

    api.getVersion()
      .then(setVersionInfo)
      .catch(() => {});

    fetchDbStats();
    fetchAlertRules();
  }, []);

  const handleToggleRegistration = async () => {
    setTogglingReg(true);
    const newStatus = !isRegistrationOpen;
    try {
      await api.toggleRegistration(newStatus);
      setSettings(prev => ({
        ...prev,
        registration_enabled: newStatus ? 'true' : 'false'
      }));
    } catch (err: unknown) {
      alert(`Hata: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setTogglingReg(false);
    }
  };

  const handleTestNotification = async (channel: string) => {
    setTestingChannel(channel);
    setTestResult(null);
    try {
      const res = await api.testNotification({
        channel,
        webhookUrl: channel === 'discord' ? settings['notification_discord_webhook_url']
                  : channel === 'ntfy' ? settings['notification_ntfy_url']
                  : channel === 'slack' ? settings['notification_slack_webhook_url']
                  : settings['notification_webhook_url'],
        botToken: settings['notification_telegram_bot_token'],
        chatId: settings['notification_telegram_chat_id'],
        smtpHost: settings['smtp_host'] || settings['notification_smtp_host'],
        smtpPort: (settings['smtp_port'] || settings['notification_smtp_port']) ? parseInt(settings['smtp_port'] || settings['notification_smtp_port'], 10) : undefined,
        smtpUser: settings['smtp_user'] || settings['notification_smtp_user'],
        smtpPass: settings['smtp_pass'] || settings['notification_smtp_pass'],
        smtpFrom: settings['smtp_from'] || settings['notification_smtp_from'],
        smtpFromName: settings['smtp_from_name'] || settings['notification_smtp_from_name'],
        smtpTo: settings['smtp_to'] || settings['notification_smtp_to'],
        smtpTls: (settings['smtp_tls'] ?? settings['notification_smtp_tls']) !== 'false'
      });
      setTestResult({ channel, success: res.success, message: res.message });
    } catch (err: unknown) {
      setTestResult({ channel, success: false, message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTestingChannel(null);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      alert(t('settings.saveError', { error: err instanceof Error ? err.message : t('common.error') }));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      const blob = await api.downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `corvus-backup-${new Date().toISOString().slice(0, 10)}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(`Hata: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setDownloadingBackup(false);
      fetchDbStats();
    }
  };

  const handleGenerateToken = () => {
    const chars = 'abcdef0123456789';
    let rand = '';
    for (let i = 0; i < 16; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    setSettings(prev => ({ ...prev, backup_push_token: rand }));
  };

  const origin = window.location.origin;
  const currentBackupToken = settings['backup_push_token'] || 'corvus_backup_token';
  const backupCurlSnippet = `curl -X POST "${origin}/api/push/${currentBackupToken}" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"success","sizeBytes":1073741824,"message":"${t('settings.backupSuccessMessage')}"}'`;

  const handleCopyBackupCmd = () => {
    navigator.clipboard.writeText(backupCurlSnippet);
    setCopiedBackupCmd(true);
    setTimeout(() => setCopiedBackupCmd(false), 2000);
  };

  return {
    settings,
    setSettings,
    versionInfo,
    saved,
    saving,
    togglingReg,
    activeChannel,
    setActiveChannel,
    testingChannel,
    testResult,
    downloadingBackup,
    copiedBackupCmd,
    dbStats,
    isCustomDays,
    setIsCustomDays,
    alertRules,
    isRegistrationOpen,
    fetchAlertRules,
    fetchDbStats,
    handleToggleRegistration,
    handleTestNotification,
    handleSave,
    handleDownloadBackup,
    handleGenerateToken,
    backupCurlSnippet,
    handleCopyBackupCmd,
  };
}
