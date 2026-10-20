import React, { useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../../i18n';
import { api } from '../../../api';
import type { ServiceIncident } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

interface AddIncidentModalProps {
  isOpen: boolean;
  incident?: ServiceIncident | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddIncidentModal: React.FC<AddIncidentModalProps> = ({
  isOpen,
  incident,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();
  const [title, setTitle] = useState(incident?.title || '');
  const [message, setMessage] = useState(incident?.message || '');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical' | 'maintenance'>(incident?.severity || 'info');
  const [status, setStatus] = useState<'investigating' | 'identified' | 'monitoring' | 'resolved'>(incident?.status || 'investigating');
  const [isPinned, setIsPinned] = useState(incident?.isPinned || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevSync, setPrevSync] = useState({ incidentId: incident?.id, isOpen });
  if (prevSync.incidentId !== incident?.id || prevSync.isOpen !== isOpen) {
    setPrevSync({ incidentId: incident?.id, isOpen });
    if (incident) {
      setTitle(incident.title);
      setMessage(incident.message);
      setSeverity(incident.severity);
      setStatus(incident.status);
      setIsPinned(incident.isPinned);
    } else {
      setTitle('');
      setMessage('');
      setSeverity('info');
      setStatus('investigating');
      setIsPinned(false);
    }
    setError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (incident) {
        await api.updateIncident(incident.id, {
          title: title.trim(),
          message: message.trim(),
          severity,
          status,
          isPinned
        });
      } else {
        await api.createIncident({
          title: title.trim(),
          message: message.trim(),
          severity,
          status,
          isPinned
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={incident ? t('incidents.editIncident') : t('incidents.newIncident')}
      subtitle={t('incidents.modalSubtitle')}
      icon={<AlertTriangle className="w-5 h-5 text-[var(--status-warn)]" />}
      maxWidth="max-w-lg"
    >
      {error && (
        <div className="p-3 bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] rounded-[var(--radius-sm)] text-xs flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            {t('incidents.incidentTitle')}
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('incidents.incidentTitlePlaceholder')}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            {t('incidents.incidentMessage')}
          </label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('incidents.incidentMessagePlaceholder')}
            className="input w-full resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t('incidents.severity')}
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="input w-full cursor-pointer"
            >
              <option value="info">{t('incidents.severities.info')}</option>
              <option value="warning">{t('incidents.severities.warning')}</option>
              <option value="critical">{t('incidents.severities.critical')}</option>
              <option value="maintenance">{t('incidents.severities.maintenance')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              {t('incidents.status')}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="input w-full cursor-pointer"
            >
              <option value="investigating">{t('incidents.statuses.investigating')}</option>
              <option value="identified">{t('incidents.statuses.identified')}</option>
              <option value="monitoring">{t('incidents.statuses.monitoring')}</option>
              <option value="resolved">{t('incidents.statuses.resolved')}</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border-hairline)] rounded-[var(--radius-sm)] flex items-start gap-3">
          <input
            type="checkbox"
            id="isPinned"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="mt-0.5 rounded border-[var(--border-hairline)] text-[var(--cloud-200)] accent-[var(--cloud-200)] cursor-pointer"
          />
          <label htmlFor="isPinned" className="text-xs cursor-pointer select-none">
            <span className="font-semibold text-[var(--text-primary)] block">
              {t('incidents.isPinned')}
            </span>
            <span className="text-[var(--text-muted)] block mt-0.5">
              {t('incidents.isPinnedHelp')}
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-hairline)]">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
          >
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
