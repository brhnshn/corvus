import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Power, 
  AlertTriangle, 
  CheckCircle2, 
  Activity, 
  Cpu, 
  HardDrive 
} from 'lucide-react';
import type { AlertRule, CreateAlertRuleRequest } from '../../../types';
import { api } from '../../../api/client';
import { Button } from '../../../components/ui/Button';
import { AddAlertRuleModal } from './AddAlertRuleModal';
import { useToast } from '../../../components/ui/Toast';
import { useI18n } from '../../../i18n';

interface AlertRulesTabProps {
  rules: AlertRule[];
  onRefresh: () => void;
}

export const AlertRulesTab: React.FC<AlertRulesTabProps> = ({ rules, onRefresh }) => {
  const { showToast } = useToast();
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleCreateRule = async (data: CreateAlertRuleRequest) => {
    try {
      await api.createAlertRule(data);
      showToast(t('alerts.ruleCreated'), 'success');
      onRefresh();
    } catch {
      showToast(t('alerts.createFailed'), 'error');
    }
  };

  const handleToggleRule = async (rule: AlertRule) => {
    try {
      setActionLoadingId(rule.id);
      await api.updateAlertRule(rule.id, { isEnabled: !rule.isEnabled });
      showToast(!rule.isEnabled ? t('alerts.ruleEnabled') : t('alerts.ruleDisabled'), 'info');
      onRefresh();
    } catch {
      showToast(t('alerts.updateFailed'), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm(t('alerts.deleteConfirm'))) return;

    try {
      setActionLoadingId(id);
      await api.deleteAlertRule(id);
      showToast(t('alerts.ruleDeleted'), 'success');
      onRefresh();
    } catch {
      showToast(t('alerts.deleteFailed'), 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric.toLowerCase()) {
      case 'cpu':
        return <Cpu className="w-4 h-4 text-[var(--cloud-200)]" />;
      case 'memory':
      case 'ram':
        return <Activity className="w-4 h-4 text-[var(--status-up)]" />;
      case 'disk':
        return <HardDrive className="w-4 h-4 text-[var(--status-warn)]" />;
      default:
        return <Bell className="w-4 h-4 text-[var(--text-muted)]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {t('alerts.sectionTitle')}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t('alerts.sectionDesc')}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          <span>{t('alerts.addRule')}</span>
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="card p-12 text-center border-dashed bg-[var(--bg-subtle)]">
          <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-[var(--text-primary)]">
            {t('alerts.noRules')}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
            {t('alerts.noRulesDesc')}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {rules.map((rule) => {
            const isLoading = actionLoadingId === rule.id;

            return (
              <div
                key={rule.id}
                className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="p-2 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] shrink-0">
                    {getMetricIcon(rule.metric)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                        {rule.name}
                      </span>
                      {rule.isFiring ? (
                        <span className="badge badge-down">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{t('alerts.firing')}</span>
                        </span>
                      ) : rule.isEnabled ? (
                        <span className="badge badge-up">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('alerts.normal')}</span>
                        </span>
                      ) : (
                        <span className="badge">
                          <span>{t('alerts.disabled')}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)]">
                      <span>
                        {t('alerts.conditionLabel')}: <strong className="text-[var(--text-primary)] font-mono">{rule.metric.toUpperCase()} {rule.operator === 'gt' ? '>' : '<'} %{rule.thresholdValue}</strong>
                      </span>
                      <span>•</span>
                      <span>{t('alerts.durationLabel')}: {t('alerts.durationValue', { seconds: rule.durationSeconds })}</span>
                      <span>•</span>
                      <span>{t('alerts.cooldownLabel')}: {t('alerts.cooldownValue', { minutes: rule.cooldownMinutes })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    disabled={isLoading}
                    title={rule.isEnabled ? t('alerts.disableRule') : t('alerts.enableRule')}
                    className={`btn btn-sm ${rule.isEnabled ? 'text-[var(--status-up)] hover:bg-[var(--status-up-bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={isLoading}
                    title={t('alerts.deleteRule')}
                    className="btn btn-sm text-[var(--status-down)] hover:bg-[var(--status-down-bg)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddAlertRuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateRule}
      />
    </div>
  );
};
