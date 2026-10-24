import React, { useState } from 'react';
import { GeneralSettingsTab } from './GeneralSettingsTab';
import { UsersTab } from './UsersTab';
import { NotificationSettingsTab } from './NotificationSettingsTab';
import { BackupSettingsTab } from './BackupSettingsTab';
import { AlertRulesTab } from './alerts/AlertRulesTab';
import { PageStage, MotionItem } from '../../components/ui/MotionStage';
import { SettingsTabNav, type SettingsTab } from './SettingsTabNav';
import { SettingsHeader } from './SettingsHeader';
import { useSettingsPage } from './useSettingsPage';

export type { SettingsTab } from './SettingsTabNav';

export interface SettingsPageProps {
  isAdmin?: boolean;
  username?: string | null;
  role?: string | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isAdmin = true,
  username,
  role = 'admin'
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const isViewer = role === 'viewer' || !isAdmin;

  const {
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
    handleToggleRegistration,
    handleTestNotification,
    handleSave,
    handleDownloadBackup,
    handleGenerateToken,
    backupCurlSnippet,
    handleCopyBackupCmd,
  } = useSettingsPage();

  return (
    <PageStage className="space-y-6">
      {/* Üst Başlık & Hızlı Kaydet Butonu */}
      <MotionItem staggerIndex={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-hairline)]">
        <SettingsHeader
          versionInfo={versionInfo}
          activeTab={activeTab}
          saved={saved}
          saving={saving}
          isViewer={isViewer}
          onSave={() => handleSave()}
        />
      </MotionItem>

      {/* Sekme Navigasyonu */}
      <MotionItem staggerIndex={1}>
        <SettingsTabNav activeTab={activeTab} onTabChange={setActiveTab} />
      </MotionItem>

      {/* Aktif Sekme İçeriği */}
      <MotionItem staggerIndex={2}>
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

          {activeTab === 'users' && (
            <UsersTab
              currentUsername={username}
              currentUserRole={role}
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

          {activeTab === 'alerts' && (
            <AlertRulesTab
              rules={alertRules}
              onRefresh={fetchAlertRules}
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
      </MotionItem>
    </PageStage>
  );
};

export default SettingsPage;
