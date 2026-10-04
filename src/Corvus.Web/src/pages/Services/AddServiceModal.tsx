import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { api } from '../../api/client';
import { AdvancedCheckOptions } from './AdvancedCheckOptions';
import { TagInput } from '../../components/common/TagInput';

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
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formDesc, setFormDesc] = useState('');
  const [formHealth, setFormHealth] = useState('');
  const [formCheckType, setFormCheckType] = useState<'http' | 'tcp' | 'ping'>('http');
  const [formPort, setFormPort] = useState<number | ''>('');
  const [formIsPublic, setFormIsPublic] = useState(true);
  const [formCheckInterval, setFormCheckInterval] = useState<number | ''>(60);
  const [formTimeoutSeconds, setFormTimeoutSeconds] = useState<number | ''>(5);
  const [formMaxRetries, setFormMaxRetries] = useState<number | ''>(1);
  const [formRetryInterval, setFormRetryInterval] = useState<number | ''>(30);
  const [formIgnoreTls, setFormIgnoreTls] = useState(false);
  const [formAcceptedStatusCodes, setFormAcceptedStatusCodes] = useState('200-299');
  const [formHttpMethod, setFormHttpMethod] = useState('GET');
  const [formExpectedBody, setFormExpectedBody] = useState('');
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
        isPublic: formIsPublic,
        checkInterval: formCheckInterval !== '' ? Number(formCheckInterval) : 60,
        timeoutSeconds: formTimeoutSeconds !== '' ? Number(formTimeoutSeconds) : 5,
        maxRetries: formMaxRetries !== '' ? Number(formMaxRetries) : 1,
        retryInterval: formRetryInterval !== '' ? Number(formRetryInterval) : 30,
        ignoreTls: formIgnoreTls,
        acceptedStatusCodes: formAcceptedStatusCodes.trim() || '200-299',
        httpMethod: formHttpMethod || 'GET',
        expectedBody: formExpectedBody.trim() || undefined,
        tags: formTags,
      });
      // Formu sıfırla ve kapat
      setFormName('');
      setFormUrl('');
      setFormCategory('');
      setFormTags([]);
      setFormDesc('');
      setFormHealth('');
      setFormCheckType('http');
      setFormPort('');
      setFormIsPublic(true);
      setFormCheckInterval(60);
      setFormTimeoutSeconds(5);
      setFormMaxRetries(1);
      setFormRetryInterval(30);
      setFormIgnoreTls(false);
      setFormAcceptedStatusCodes('200-299');
      setFormHttpMethod('GET');
      setFormExpectedBody('');
      onClose();
      await onSuccess();
    } catch (err) {
      console.error('Servis eklenemedi', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="sheet-glass border border-white/10 rounded-[28px] p-5 sm:p-6 w-full max-w-md max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl my-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-semibold text-white text-base">{t('services.modalTitle')}</h3>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAdd} className="space-y-3.5 text-sm">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">{t('services.formName')}</label>
            <input
              type="text"
              required
              placeholder={t('services.formNamePlaceholder')}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">{t('services.formCheckType')}</label>
            <div className="flex items-center gap-4 py-1 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                <input
                  type="radio"
                  name="checkType"
                  value="http"
                  checked={formCheckType === 'http'}
                  onChange={() => setFormCheckType('http')}
                  className="accent-white"
                />
                <span>{t('services.checkTypeHttp')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                <input
                  type="radio"
                  name="checkType"
                  value="tcp"
                  checked={formCheckType === 'tcp'}
                  onChange={() => setFormCheckType('tcp')}
                  className="accent-white"
                />
                <span>{t('services.checkTypeTcp')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
                <input
                  type="radio"
                  name="checkType"
                  value="ping"
                  checked={formCheckType === 'ping'}
                  onChange={() => setFormCheckType('ping')}
                  className="accent-white"
                />
                <span>{t('services.checkTypePing')}</span>
              </label>
            </div>
          </div>

          {formCheckType === 'tcp' && (
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">{t('services.formPort')}</label>
              <input
                type="number"
                required
                placeholder={t('services.formPortPlaceholder')}
                value={formPort}
                onChange={(e) => setFormPort(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
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
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">{t('services.formCategory')}</label>
            <input
              type="text"
              placeholder={t('services.formCategoryPlaceholder')}
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formTags') || 'Etiketler (Ortam / Grup)'}
            </label>
            <TagInput
              tags={formTags}
              onChange={setFormTags}
              placeholder={t('services.tagPlaceholder') || 'Etiket ekle (Prod, DB, API)...'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">{t('services.formDescription')}</label>
            <input
              type="text"
              placeholder={t('services.formDescriptionPlaceholder')}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
            />
          </div>

          {formCheckType === 'http' && (
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">{t('services.formHealthUrl')}</label>
              <input
                type="url"
                placeholder={t('services.formHealthUrlPlaceholder')}
                value={formHealth}
                onChange={(e) => setFormHealth(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
              />
            </div>
          )}

          <AdvancedCheckOptions
            checkType={formCheckType}
            checkInterval={formCheckInterval}
            onChangeCheckInterval={setFormCheckInterval}
            timeoutSeconds={formTimeoutSeconds}
            onChangeTimeoutSeconds={setFormTimeoutSeconds}
            maxRetries={formMaxRetries}
            onChangeMaxRetries={setFormMaxRetries}
            retryInterval={formRetryInterval}
            onChangeRetryInterval={setFormRetryInterval}
            ignoreTls={formIgnoreTls}
            onChangeIgnoreTls={setFormIgnoreTls}
            acceptedStatusCodes={formAcceptedStatusCodes}
            onChangeAcceptedStatusCodes={setFormAcceptedStatusCodes}
            httpMethod={formHttpMethod}
            onChangeHttpMethod={setFormHttpMethod}
            expectedBody={formExpectedBody}
            onChangeExpectedBody={setFormExpectedBody}
          />

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/80">
              <input
                type="checkbox"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
                className="accent-white rounded"
              />
              <span>{t('services.formIsPublic')}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
