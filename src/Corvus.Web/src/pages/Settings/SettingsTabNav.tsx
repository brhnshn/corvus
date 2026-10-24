import React from 'react';
import { Shield, UserCheck, Bell, Activity, Database } from 'lucide-react';
import { useI18n } from '../../i18n';

export type SettingsTab = 'general' | 'users' | 'notifications' | 'alerts' | 'backup';

export interface SettingsTabNavProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
}

export const SettingsTabNav: React.FC<SettingsTabNavProps> = ({ activeTab, onTabChange }) => {
  const { t } = useI18n();

  const tabs = [
    { id: 'general' as const, label: t('settings.tabGeneral'), icon: Shield },
    { id: 'users' as const, label: t('settings.tabUsers'), icon: UserCheck },
    { id: 'notifications' as const, label: t('settings.tabNotifications'), icon: Bell },
    { id: 'alerts' as const, label: t('alerts.sectionTitle'), icon: Activity },
    { id: 'backup' as const, label: t('settings.tabBackup'), icon: Database }
  ];

  return (
    <div className="tabs overflow-x-auto no-scrollbar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`tab ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
