import React, { useState } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { api } from '../../../api/client';
import type { AlertRule, CreateAlertRuleRequest } from '../../../types';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { useI18n } from '../../../i18n';

interface AddAlertRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: CreateAlertRuleRequest) => Promise<void> | void;
  onSuccess?: (newRule: AlertRule) => void;
}

export const AddAlertRuleModal: React.FC<AddAlertRuleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<'cpu' | 'memory' | 'disk'>('cpu');
  const [operator, setOperator] = useState<'gt' | 'lt'>('gt');
  const [thresholdValue, setThresholdValue] = useState<number>(85);
  const [durationSeconds, setDurationSeconds] = useState<number>(60);
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    const ruleData: CreateAlertRuleRequest = {
      name: name.trim(),
      targetType: 'system',
      metric,
      operator,
      thresholdValue,
      durationSeconds,
      cooldownMinutes,
      isEnabled: true,
    };

    try {
      if (onSubmit) {
        await onSubmit(ruleData);
      } else {
        const created = await api.createAlertRule(ruleData);
        onSuccess?.(created);
      }
      onClose();
      setName('');
      setThresholdValue(85);
    } catch (err: any) {
      setError(err?.message || t('alerts.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('alerts.addRuleTitle')}
      subtitle={t('alerts.addRuleSubtitle')}
      icon={<Bell className="w-5 h-5 text-[var(--text-primary)]" />}
      maxWidth="max-w-lg"
    >
      {error && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
            {t('alerts.ruleName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('alerts.ruleNamePlaceholder')}
            required
            className="input w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              {t('alerts.metricType')}
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="input w-full cursor-pointer"
            >
              <option value="cpu">{t('alerts.metricCpu')}</option>
              <option value="memory">{t('alerts.metricMemory')}</option>
              <option value="disk">{t('alerts.metricDisk')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              {t('alerts.condition')}
            </label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as any)}
              className="input w-full cursor-pointer"
            >
              <option value="gt">{t('alerts.opGt')}</option>
              <option value="lt">{t('alerts.opLt')}</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              {t('alerts.threshold')}: %{thresholdValue}
            </label>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={thresholdValue}
            onChange={(e) => setThresholdValue(Number(e.target.value))}
            className="w-full accent-[var(--cloud-200)] cursor-pointer"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              {t('alerts.durationSeconds')}
            </label>
            <input
              type="number"
              min="10"
              step="5"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Number(e.target.value))}
              className="input w-full"
            />
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
              {t('alerts.durationHint')}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              {t('alerts.cooldownMinutes')}
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={cooldownMinutes}
              onChange={(e) => setCooldownMinutes(Number(e.target.value))}
              className="input w-full"
            />
            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
              {t('alerts.cooldownHint')}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? t('common.saving') : t('alerts.createRule')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
