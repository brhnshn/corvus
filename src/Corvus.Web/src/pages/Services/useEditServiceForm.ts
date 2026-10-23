import type React from 'react';
import { useState } from 'react';
import { useI18n } from '../../i18n';
import { api, type Service } from '../../api/client';
import { normalizeServiceUrls, resolveCheckType, type EditCheckType } from './editService.utils';

interface UseEditServiceFormOptions {
  service: Service | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

/** Servis düzenleme formunun durumunu, servis değişiminde sıfırlamayı ve kaydetmeyi yönetir. */
export const useEditServiceForm = ({ service, onClose, onSuccess }: UseEditServiceFormOptions) => {
  const { t } = useI18n();
  const [formName, setFormName] = useState(service?.name || '');
  const [formUrl, setFormUrl] = useState(service?.url || '');
  const [formCategory, setFormCategory] = useState(service?.category || '');
  const [formTags, setFormTags] = useState<string[]>(service?.tags || []);
  const [formDesc, setFormDesc] = useState(service?.description || '');
  const [formHealth, setFormHealth] = useState(service?.healthCheckUrl || '');
  const [formIcon, setFormIcon] = useState(service?.icon || '');
  const [formCheckType, setFormCheckType] = useState<EditCheckType>(resolveCheckType(service));
  const [formPort, setFormPort] = useState<number | ''>(service?.port !== undefined && service?.port !== null ? service.port : '');
  const [formIsPublic, setFormIsPublic] = useState(service?.isPublic === true);
  const [formCheckInterval, setFormCheckInterval] = useState<number | ''>(service?.checkInterval ?? 60);
  const [formTimeoutSeconds, setFormTimeoutSeconds] = useState<number | ''>(service?.timeoutSeconds ?? 5);
  const [formMaxRetries, setFormMaxRetries] = useState<number | ''>(service?.maxRetries ?? 1);
  const [formRetryInterval, setFormRetryInterval] = useState<number | ''>(service?.retryInterval ?? 30);
  const [formIgnoreTls, setFormIgnoreTls] = useState(service?.ignoreTls === true);
  const [formAcceptedStatusCodes, setFormAcceptedStatusCodes] = useState(service?.acceptedStatusCodes || '200-299');
  const [formHttpMethod, setFormHttpMethod] = useState(service?.httpMethod || 'GET');
  const [formExpectedBody, setFormExpectedBody] = useState(service?.expectedBody || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prevServiceId, setPrevServiceId] = useState(service?.id);
  if (service && service.id !== prevServiceId) {
    setPrevServiceId(service.id);
    setFormName(service.name || '');
    setFormUrl(service.url || '');
    setFormCategory(service.category || '');
    setFormDesc(service.description || '');
    setFormHealth(service.healthCheckUrl || '');
    setFormIcon(service.icon || '');
    setFormCheckType(resolveCheckType(service));
    setFormPort(service.port !== undefined && service.port !== null ? service.port : '');
    setFormIsPublic(service.isPublic === true);
    setFormCheckInterval(service.checkInterval ?? 60);
    setFormTimeoutSeconds(service.timeoutSeconds ?? 5);
    setFormMaxRetries(service.maxRetries ?? 1);
    setFormRetryInterval(service.retryInterval ?? 30);
    setFormIgnoreTls(service.ignoreTls === true);
    setFormAcceptedStatusCodes(service.acceptedStatusCodes || '200-299');
    setFormHttpMethod(service.httpMethod || 'GET');
    setFormExpectedBody(service.expectedBody || '');
    setFormTags(service.tags || []);
    setErrorMsg(null);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !formName.trim()) return;

    const { finalUrl, finalHealth } = normalizeServiceUrls(formUrl, formHealth, formCheckType);

    setSaving(true);
    setErrorMsg(null);

    try {
      await api.updateService(service.id, {
        name: formName.trim(),
        url: finalUrl || undefined,
        category: formCategory.trim() || undefined,
        description: formDesc.trim() || undefined,
        healthCheckUrl: finalHealth || undefined,
        icon: formIcon.trim() || undefined,
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
        tags: formTags
      });

      onClose();
      await onSuccess();
    } catch (err: unknown) {
      console.error('Servis güncellenemedi:', err);
      setErrorMsg(err instanceof Error ? err.message : t('services.updateError'));
    } finally {
      setSaving(false);
    }
  };

  return {
    formName, setFormName,
    formUrl, setFormUrl,
    formCategory, setFormCategory,
    formTags, setFormTags,
    formDesc, setFormDesc,
    formHealth, setFormHealth,
    formIcon, setFormIcon,
    formCheckType, setFormCheckType,
    formPort, setFormPort,
    formIsPublic, setFormIsPublic,
    formCheckInterval, setFormCheckInterval,
    formTimeoutSeconds, setFormTimeoutSeconds,
    formMaxRetries, setFormMaxRetries,
    formRetryInterval, setFormRetryInterval,
    formIgnoreTls, setFormIgnoreTls,
    formAcceptedStatusCodes, setFormAcceptedStatusCodes,
    formHttpMethod, setFormHttpMethod,
    formExpectedBody, setFormExpectedBody,
    saving,
    errorMsg,
    handleSave
  };
};
