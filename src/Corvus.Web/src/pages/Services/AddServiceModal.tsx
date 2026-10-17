import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { api } from '../../api/client';
import { AdvancedCheckOptions } from './AdvancedCheckOptions';
import { TagInput } from '../../components/common/TagInput';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    try {
      const payload: Parameters<typeof api.createService>[0] = {
        name: formName.trim(),
        url: formUrl.trim() || undefined,
        category: formCategory.trim() || undefined,
        tags: formTags.length > 0 ? formTags : undefined,
        description: formDesc.trim() || undefined,
        healthCheckUrl: formHealth.trim() || undefined,
        checkType: formCheckType,
        isPublic: formIsPublic,
        checkInterval: typeof formCheckInterval === 'number' ? formCheckInterval : undefined,
        timeoutSeconds: typeof formTimeoutSeconds === 'number' ? formTimeoutSeconds : undefined,
        maxRetries: typeof formMaxRetries === 'number' ? formMaxRetries : undefined,
        retryInterval: typeof formRetryInterval === 'number' ? formRetryInterval : undefined,
        ignoreTls: formIgnoreTls,
        acceptedStatusCodes: formAcceptedStatusCodes.trim() || undefined,
        httpMethod: formHttpMethod,
        expectedBody: formExpectedBody.trim() || undefined
      };

      if (formCheckType === 'tcp' && typeof formPort === 'number') {
        payload.port = formPort;
      }

      await api.createService(payload);
      await onSuccess();
      onClose();
      // Reset
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
    } catch (err: unknown) {
      alert(`${t('common.error')}: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('services.modalTitle')}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleAdd} className="space-y-3.5 text-xs sm:text-sm">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t('services.formName')}</label>
          <input
            type="text"
            required
            placeholder={t('services.formNamePlaceholder')}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">{t('services.formCheckType')}</label>
          <div className="flex items-center gap-4 py-1 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)]">
              <input
                type="radio"
                name="checkType"
                value="http"
                checked={formCheckType === 'http'}
                onChange={() => setFormCheckType('http')}
                className="accent-[var(--cloud-200)]"
              />
              <span>{t('services.checkTypeHttp')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)]">
              <input
                type="radio"
                name="checkType"
                value="tcp"
                checked={formCheckType === 'tcp'}
                onChange={() => setFormCheckType('tcp')}
                className="accent-[var(--cloud-200)]"
              />
              <span>{t('services.checkTypeTcp')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)]">
              <input
                type="radio"
                name="checkType"
                value="ping"
                checked={formCheckType === 'ping'}
                onChange={() => setFormCheckType('ping')}
                className="accent-[var(--cloud-200)]"
              />
              <span>{t('services.checkTypePing')}</span>
            </label>
          </div>
        </div>

        {formCheckType === 'tcp' && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t('services.formPort')}</label>
            <input
              type="number"
              required
              placeholder={t('services.formPortPlaceholder')}
              value={formPort}
              onChange={(e) => setFormPort(e.target.value ? Number(e.target.value) : '')}
              className="input w-full"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t('services.formCategory')}</label>
          <input
            type="text"
            placeholder={t('services.formCategoryPlaceholder')}
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
            {t('services.formTags')}
          </label>
          <TagInput
            tags={formTags}
            onChange={setFormTags}
            placeholder={t('services.tagPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t('services.formDescription')}</label>
          <input
            type="text"
            placeholder={t('services.formDescriptionPlaceholder')}
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="input w-full"
          />
        </div>

        {formCheckType === 'http' && (
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t('services.formHealthUrl')}</label>
            <input
              type="url"
              placeholder={t('services.formHealthUrlPlaceholder')}
              value={formHealth}
              onChange={(e) => setFormHealth(e.target.value)}
              className="input w-full"
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
          <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={formIsPublic}
              onChange={(e) => setFormIsPublic(e.target.checked)}
              className="accent-[var(--cloud-200)] rounded"
            />
            <span>{t('services.formIsPublic')}</span>
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
