import React, { useEffect, useState } from 'react';
import { api, type VersionInfo } from '../../api/client';
import { 
  Save, 
  Check, 
  ExternalLink,
  Shield,
  Bell,
  Database,
  RefreshCw
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { GeneralSettingsTab } from './GeneralSettingsTab';
import { NotificationSettingsTab, type ChannelType } from './NotificationSettingsTab';
import { BackupSettingsTab } from './BackupSettingsTab';

type SettingsTab = 'general' | 'notifications' | 'backup';

export const SettingsPage: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
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

  const isRegistrationOpen = settings['registration_enabled'] !== 'false';

  const fetchDbStats = () => {
    api.getDbStats()
      .then(data => { if (data) setDbStats(data); })
      .catch(() => {});
  };

  useEffect(() => {
    api.getSettings()
      .then((data) => {
        setSettings(data);
        const days = data['retention_days'] ?? '30';
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
      alert(`Kaydetme hatası: ${err instanceof Error ? err.message : 'Error'}`);
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
  -d '{"status":"success","sizeBytes":1073741824,"message":"Yedek tamamlandı"}'`;

  const handleCopyBackupCmd = () => {
    navigator.clipboard.writeText(backupCurlSnippet);
    setCopiedBackupCmd(true);
    setTimeout(() => setCopiedBackupCmd(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık & Hızlı Kaydet Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2a2e3f]/60">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[#e5e7eb]">{t('settings.title')}</h1>
            {versionInfo && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#1a1d29] border border-[#2a2e3f] text-[#d4d4d8] font-semibold">
                  v{versionInfo.currentVersion}
                </span>
                {versionInfo.isUpdateAvailable ? (
                  <a
                    href={versionInfo.releaseUrl || "https://github.com/brhnshn/corvus/releases"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors font-medium cursor-pointer"
                    title={t('settings.versionUpdateAvailable', { version: `v${versionInfo.latestVersion}` })}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>v{versionInfo.latestVersion}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-[#1a1d29] border border-[#2a2e3f] text-[#22c55e]">
                    <Check className="w-3 h-3" />
                    <span className="text-[#9ca3af]">{t('settings.versionUpToDate')}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-[#9ca3af] mt-1">{t('settings.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-[#22c55e] font-medium bg-[#22c55e]/10 border border-[#22c55e]/30 px-3 py-1.5 rounded-lg animate-in fade-in duration-200">
              <Check className="w-4 h-4" />
              {t('settings.savedToast')}
            </span>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d4d4d8] text-[#0f1117] text-xs font-semibold hover:bg-[#e4e4e7] transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? t('common.saving') : t('settings.saveBtn')}</span>
          </button>
        </div>
      </div>

      {/* Sekme Navigasyonu */}
      <div className="flex items-center p-1 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-[#0f1117] text-white shadow-sm border border-[#2a2e3f]'
              : 'text-[#9ca3af] hover:text-[#e5e7eb]'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('settings.tabGeneral')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'bg-[#0f1117] text-white shadow-sm border border-[#2a2e3f]'
              : 'text-[#9ca3af] hover:text-[#e5e7eb]'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-indigo-400" />
          <span>{t('settings.tabNotifications')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'backup'
              ? 'bg-[#0f1117] text-white shadow-sm border border-[#2a2e3f]'
              : 'text-[#9ca3af] hover:text-[#e5e7eb]'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('settings.tabBackup')}</span>
        </button>
      </div>

      {/* Aktif Sekme İçeriği */}
      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === 'general' && (
          <GeneralSettingsTab
            settings={settings}
            setSettings={setSettings}
            dbStats={dbStats}
            isRegistrationOpen={isRegistrationOpen}
            togglingReg={togglingReg}
            onToggleRegistration={handleToggleRegistration}
            isCustomDays={isCustomDays}
            setIsCustomDays={setIsCustomDays}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationSettingsTab
            settings={settings}
            setSettings={setSettings}
            activeChannel={activeChannel}
            setActiveChannel={setActiveChannel}
            testingChannel={testingChannel}
            testResult={testResult}
            onTestNotification={handleTestNotification}
          />
        )}

        {activeTab === 'backup' && (
          <BackupSettingsTab
            settings={settings}
            setSettings={setSettings}
            downloadingBackup={downloadingBackup}
            onDownloadBackup={handleDownloadBackup}
            onGenerateToken={handleGenerateToken}
            backupCurlSnippet={backupCurlSnippet}
            copiedBackupCmd={copiedBackupCmd}
            onCopyBackupCmd={handleCopyBackupCmd}
          />
        )}
      </form>
    </div>
  );
};

export default SettingsPage;
