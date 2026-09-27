import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { api } from '../../../api/client';
import { useI18n } from '../../../i18n';
import type { ServiceIncident } from '../../../types';

interface AddIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  incident?: ServiceIncident | null;
}

export const AddIncidentModal: React.FC<AddIncidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  incident
}) => {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical' | 'maintenance'>('info');
  const [status, setStatus] = useState<'investigating' | 'identified' | 'monitoring' | 'resolved'>('investigating');
  const [isPinned, setIsPinned] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
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
        setIsPinned(true);
      }
      setError(null);
    }
  }, [isOpen, incident]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError(t('incidents.incidentTitle') + ' & ' + t('incidents.incidentMessage'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (incident) {
        await api.updateIncident(incident.id, {
          title: title.trim(),
          message: message.trim(),
          severity,
          isPinned,
          status
        });
      } else {
        await api.createIncident({
          title: title.trim(),
          message: message.trim(),
          severity,
          isPinned,
          status
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-2xl p-5 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl my-auto">
        <div className="flex items-center justify-between border-b border-[#2a2e3f] pb-3">
          <h3 className="font-semibold text-[#e5e7eb] text-base">
            {incident ? t('incidents.editIncident') : t('incidents.newIncident')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ca3af] hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">
              {t('incidents.incidentTitle')}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('incidents.incidentTitlePlaceholder')}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3f] rounded-lg text-sm text-[#e5e7eb] focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">
              {t('incidents.incidentMessage')}
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('incidents.incidentMessagePlaceholder')}
              className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3f] rounded-lg text-sm text-[#e5e7eb] focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                {t('incidents.severity')}
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3f] rounded-lg text-sm text-[#e5e7eb] focus:outline-none focus:border-indigo-500"
              >
                <option value="info">{t('incidents.severities.info')}</option>
                <option value="warning">{t('incidents.severities.warning')}</option>
                <option value="critical">{t('incidents.severities.critical')}</option>
                <option value="maintenance">{t('incidents.severities.maintenance')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                {t('incidents.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0f1117] border border-[#2a2e3f] rounded-lg text-sm text-[#e5e7eb] focus:outline-none focus:border-indigo-500"
              >
                <option value="investigating">{t('incidents.statuses.investigating')}</option>
                <option value="identified">{t('incidents.statuses.identified')}</option>
                <option value="monitoring">{t('incidents.statuses.monitoring')}</option>
                <option value="resolved">{t('incidents.statuses.resolved')}</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-[#0f1117] border border-[#2a2e3f] rounded-xl flex items-start gap-3">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="mt-0.5 rounded border-[#2a2e3f] text-indigo-600 focus:ring-indigo-500 bg-[#1a1d29] cursor-pointer"
            />
            <label htmlFor="isPinned" className="text-xs cursor-pointer select-none">
              <span className="font-medium text-[#e5e7eb] block">
                {t('incidents.isPinned')}
              </span>
              <span className="text-[#9ca3af] block mt-0.5">
                {t('incidents.isPinnedHelp')}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#2a2e3f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#9ca3af] hover:text-white transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
