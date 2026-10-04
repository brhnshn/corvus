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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto select-none">
      <div className="sheet-glass border border-white/10 rounded-[28px] p-5 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto space-y-4 shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] my-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-bold text-[#eceef6] text-base">
            {incident ? t('incidents.editIncident') : t('incidents.newIncident')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9ba0b5] hover:text-[#eceef6] p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#9ba0b5] mb-1.5">
              {t('incidents.incidentTitle')}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('incidents.incidentTitlePlaceholder')}
              className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-[#eceef6] placeholder:text-[#9ba0b5]/50 focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ba0b5] mb-1.5">
              {t('incidents.incidentMessage')}
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('incidents.incidentMessagePlaceholder')}
              className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-[#eceef6] placeholder:text-[#9ba0b5]/50 focus:outline-none focus:border-white/20 transition-colors resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#9ba0b5] mb-1.5">
                {t('incidents.severity')}
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-[#eceef6] focus:outline-none focus:border-white/20 transition-colors"
              >
                <option value="info" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.severities.info')}</option>
                <option value="warning" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.severities.warning')}</option>
                <option value="critical" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.severities.critical')}</option>
                <option value="maintenance" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.severities.maintenance')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#9ba0b5] mb-1.5">
                {t('incidents.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-[#eceef6] focus:outline-none focus:border-white/20 transition-colors"
              >
                <option value="investigating" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.statuses.investigating')}</option>
                <option value="identified" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.statuses.identified')}</option>
                <option value="monitoring" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.statuses.monitoring')}</option>
                <option value="resolved" className="bg-[#1b1d2a] text-[#eceef6]">{t('incidents.statuses.resolved')}</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl flex items-start gap-3">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="mt-0.5 rounded border-white/20 text-white bg-white/5 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="isPinned" className="text-xs cursor-pointer select-none">
              <span className="font-semibold text-[#eceef6] block">
                {t('incidents.isPinned')}
              </span>
              <span className="text-[#9ba0b5] block mt-0.5">
                {t('incidents.isPinnedHelp')}
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-[#eceef6] transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
