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
import { Button } from '../../components/ui/Button';
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

  const tabs = [
    { id: 'general' as const, label: t('settings.tabGeneral') || 'Genel & Güvenlik', icon: Shield },
    { id: 'notifications' as const, label: t('settings.tabNotifications') || 'Bildirim Kanalları', icon: Bell },
    { id: 'backup' as const, label: t('settings.tabBackup') || 'Yedekleme & SQLite', icon: Database }
  ];

  return (
    <div className="space-y-4 animate-rv">
      {/* Üst Başlık & Hızlı Kaydet Butonu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#eceef6]">
              {t('settings.title') || 'Sistem Ayarları'}
            </h1>
            {versionInfo && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-[12px] bg-white/[0.07] border border-white/10 text-[#eceef6] font-semibold">
                  v{versionInfo.currentVersion}
                </span>
                {versionInfo.isUpdateAvailable ? (
                  <a
                    href={versionInfo.releaseUrl || "https://github.com/brhnshn/corvus/releases"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-[12px] bg-[#34d399]/15 border border-[#34d399]/30 text-[#34d399] hover:bg-[#34d399]/25 transition-colors font-medium cursor-pointer"
                    title={t('settings.versionUpdateAvailable', { version: `v${versionInfo.latestVersion}` }) || `v${versionInfo.latestVersion} hazır`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-dot-pulse" />
                    <span>v{versionInfo.latestVersion}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[12px] bg-white/[0.04] border border-white/10 text-[#9ba0b5]">
                    <Check className="w-3 h-3 text-[#34d399]" />
                    <span>{t('settings.versionUpToDate') || 'Güncel'}</span>
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-[13px] text-[#9ba0b5] mt-0.5">
            {t('settings.subtitle') || 'Sistem parametreleri, güvenlik tercihleri ve entegrasyonlar'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-[#34d399] font-medium bg-[#34d399]/15 border border-[#34d399]/30 px-3 py-1.5 rounded-[12px]">
              <Check className="w-3.5 h-3.5" />
              {t('settings.savedToast') || 'Kaydedildi'}
            </span>
          )}
          <Button
            variant="primary"
            onClick={() => handleSave()}
            disabled={saving}
            icon={saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          >
            {saving ? (t('common.saving') || 'Kaydediliyor...') : (t('settings.saveBtn') || 'Ayarları Kaydet')}
          </Button>
        </div>
      </div>

      {/* Sekme Navigasyonu */}
      <div className="glass rounded-[19px] p-[3px] flex gap-0.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[16px] text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#d5d5dc] text-[#1b1d2a] shadow-xs'
                  : 'text-[#9ba0b5] hover:text-[#eceef6]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1b1d2a]' : 'text-[#9ba0b5]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Aktif Sekme İçeriği */}
      <form onSubmit={handleSave} className="space-y-4">
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
