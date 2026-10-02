import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { api } from '../../api/client';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useI18n();
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formHealth, setFormHealth] = useState('');
  const [formCheckType, setFormCheckType] = useState<'http' | 'tcp' | 'ping'>('http');
  const [formPort, setFormPort] = useState<number | ''>('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let finalUrl = formUrl.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl) && formCheckType === 'http') {
      finalUrl = `http://${finalUrl}`;
    }

    let finalHealth = formHealth.trim();
    if (!finalHealth && formCheckType === 'http' && finalUrl) {
      finalHealth = finalUrl;
    }

    setSaving(true);
    try {
      await api.createService({
        name: formName.trim(),
        url: finalUrl || undefined,
        category: formCategory.trim() || t('services.defaultCategory'),
        description: formDesc.trim() || undefined,
        healthCheckUrl: finalHealth || undefined,
        checkType: formCheckType,
        port: formPort !== '' ? Number(formPort) : undefined,
        isPublic: formIsPublic
      });
      // Formu sıfırla ve kapat
      setFormName('');
      setFormUrl('');
      setFormCategory('');
      setFormDesc('');
      setFormHealth('');
      setFormCheckType('http');
      setFormPort('');
      setFormIsPublic(true);
      onClose();
      await onSuccess();
    } catch (err) {
      console.error('Servis eklenemedi', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-2xl p-5 sm:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl my-auto">
        <div className="flex items-center justify-between border-b border-[#2a2e3f] pb-3">
          <h3 className="font-semibold text-[#e5e7eb] text-base">{t('services.modalTitle')}</h3>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">{t('services.formName')}</label>
            <input
              type="text"
              required
              placeholder={t('services.formNamePlaceholder')}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">{t('services.formCheckType')}</label>
            <div className="flex items-center gap-4 py-1 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="radio"
                  name="checkType"
                  value="http"
                  checked={formCheckType === 'http'}
                  onChange={() => setFormCheckType('http')}
                  className="accent-indigo-500"
                />
                <span>{t('services.checkTypeHttp')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="radio"
                  name="checkType"
                  value="tcp"
                  checked={formCheckType === 'tcp'}
                  onChange={() => setFormCheckType('tcp')}
                  className="accent-indigo-500"
                />
                <span>{t('services.checkTypeTcp')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="radio"
                  name="checkType"
                  value="ping"
                  checked={formCheckType === 'ping'}
                  onChange={() => setFormCheckType('ping')}
                  className="accent-indigo-500"
                />
                <span>{t('services.checkTypePing')}</span>
              </label>
            </div>
          </div>

          {formCheckType === 'tcp' && (
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1">{t('services.formPort')}</label>
              <input
                type="number"
                required
                placeholder={t('services.formPortPlaceholder')}
                value={formPort}
                onChange={(e) => setFormPort(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">
              {formCheckType === 'http'
                ? t('services.formUrl')
                : formCheckType === 'ping'
                ? t('services.formPingHost')
                : t('services.formHost')}
            </label>
            <input
              type="text"
              required={formCheckType === 'ping'}
              placeholder={
                formCheckType === 'http'
                  ? t('services.formUrlPlaceholder')
                  : formCheckType === 'ping'
                  ? t('services.formPingHostPlaceholder')
                  : t('services.formHostPlaceholder')
              }
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">{t('services.formCategory')}</label>
            <input
              type="text"
              placeholder={t('services.formCategoryPlaceholder')}
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">{t('services.formDescription')}</label>
            <input
              type="text"
              placeholder={t('services.formDescriptionPlaceholder')}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8]"
            />
          </div>

          {formCheckType === 'http' && (
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1">{t('services.formHealthUrl')}</label>
              <input
                type="url"
                placeholder={t('services.formHealthUrlPlaceholder')}
                value={formHealth}
                onChange={(e) => setFormHealth(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-[#d4d4d8]"
              />
            </div>
          )}

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
                className="accent-indigo-500 rounded"
              />
              <span>{t('services.formIsPublic')}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2e3f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#2a2e3f] text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#d4d4d8] text-[#0f1117] text-xs font-semibold hover:bg-[#e4e4e7] disabled:opacity-50 cursor-pointer"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
