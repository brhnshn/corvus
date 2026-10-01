import React, { useEffect, useState } from 'react';
import { api, type VersionInfo } from '../../api/client';
import { 
  Save, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink,
  Shield,
  Bell,
  Database,
  Lock,
  HardDrive
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
    api.getSettings().then((data) => {
      setSettings(data);
      const days = data['retention_days'] ?? '30';
      const known = ['7', '15', '30', '60', '90', '180', '365', '0'];
      if (!known.includes(days) && days !== '') {
        setIsCustomDays(true);
      }
    });
    api.getVersion().then(setVersionInfo).catch(() => {});
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
                  : settings['notification_webhook_url'],
        botToken: settings['notification_telegram_bot_token'],
        chatId: settings['notification_telegram_chat_id']
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#e5e7eb]">{t('settings.title')}</h1>
          <p className="text-sm text-[#9ca3af]">{t('settings.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
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
            <Save className="w-4 h-4" />
            <span>{saving ? t('common.saving') : t('settings.saveBtn')}</span>
          </button>
        </div>
      </div>

      {/* 2 Kolonlu Modern Izgara: Sol 8 Kolon Formlar, Sağ 4 Kolon Sticky Sistem & Durum Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* SOL KOLON: Sekme Navigasyonu ve Form Alanları */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sekme Seçici (Tab Pills) */}
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

            {/* Alt Kaydet Aksiyon Çubuğu */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[#1a1d29] border border-[#2a2e3f]">
              <div className="text-xs text-[#9ca3af]">
                {saved ? (
                  <span className="text-[#22c55e] font-medium flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    {t('settings.savedToast')}
                  </span>
                ) : (
                  <span>{t('settings.quickSaveDesc')}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#d4d4d8] text-[#0f1117] text-xs font-semibold hover:bg-[#e4e4e7] transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? t('common.saving') : t('settings.saveBtn')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* SAĞ KOLON: Sistem & Durum Sidebar'ı (Sticky) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Kart 1: Sistem ve Sürüm Durumu */}
          <div className="p-5 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a2e3f]/60">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#e5e7eb]">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h2>{t('settings.versionCardTitle')}</h2>
              </div>
              {versionInfo && (
                <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#0f1117] border border-[#2a2e3f] text-[#e5e7eb] font-semibold">
                  v{versionInfo.currentVersion}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-xs">
                {versionInfo?.isUpdateAvailable ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-medium p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>{t('settings.versionUpdateAvailable', { version: `v${versionInfo.latestVersion}` })}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[#9ca3af] p-2.5 rounded-lg bg-[#0f1117] border border-[#2a2e3f]">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    <span>{t('settings.versionUpToDate')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-1 text-[#9ca3af]">
                <span>{t('settings.environmentTag')}</span>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#0f1117] border border-[#2a2e3f] text-[#e5e7eb]">
                  Native AOT / Linux
                </span>
              </div>

              <a
                href={versionInfo?.releaseUrl || "https://github.com/brhnshn/corvus/releases"}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#2a2e3f] bg-[#0f1117] text-xs font-medium text-[#d4d4d8] hover:text-white hover:border-[#d4d4d8] transition-colors"
              >
                <span>{t('settings.githubReleasesBtn')}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#9ca3af]" />
              </a>
            </div>
          </div>

          {/* Kart 2: Veritabanı ve Depolama Durumu */}
          <div className="p-5 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#e5e7eb] pb-2 border-b border-[#2a2e3f]/60">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <h2>{t('settings.dbHealthTitle')}</h2>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#9ca3af]">{t('settings.dbSize')}</span>
                <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-[#0f1117] border border-[#2a2e3f]">
                  {dbStats ? dbStats.formattedSize : t('settings.dbSizeLoading')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9ca3af]">{t('settings.retentionDays')}</span>
                <span className="font-mono text-[#d4d4d8]">
                  {settings['retention_days'] === '0' 
                    ? t('settings.retentionPresets.unlimited') 
                    : `${settings['retention_days'] ?? '30'} gün`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9ca3af]">SQLite WAL Modu</span>
                <span className="text-[#22c55e] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  Aktif & Optimize
                </span>
              </div>
            </div>
          </div>

          {/* Kart 3: Güvenlik ve Hızlı Durum */}
          <div className="p-5 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#e5e7eb] pb-2 border-b border-[#2a2e3f]/60">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h2>{t('settings.userRegistration')}</h2>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#9ca3af]">Erişim Durumu</span>
              <span className={`px-2.5 py-1 rounded-md font-semibold text-xs border ${
                isRegistrationOpen 
                  ? 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30' 
                  : 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/30'
              }`}>
                {isRegistrationOpen ? t('settings.regOpenBtn').split(' ')[0] : t('settings.regClosedBtn').split(' ')[0]}
              </span>
            </div>

            <p className="text-[11px] text-[#9ca3af] leading-relaxed pt-1">
              {isRegistrationOpen 
                ? 'Panel şu anda yeni kullanıcı kayıtlarına açıktır.' 
                : 'Panel kayıtları kilitlidir. Yalnızca yetkili mevcut kullanıcılar giriş yapabilir.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
