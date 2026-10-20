import React, { useState } from 'react';
import { Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { enableUptime } from '../../../api/uptime';
import type { Service } from '../../../types';
import { useI18n } from '../../../i18n';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { extractPort } from '../../../utils/url';

interface EnableUptimeModalProps {
  isOpen: boolean;
  service: Service | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const EnableUptimeModal: React.FC<EnableUptimeModalProps> = ({
  isOpen,
  service,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();

  const [name, setName] = useState(service?.name || '');
  const [url, setUrl] = useState(service?.url || '');
  const [checkType, setCheckType] = useState<'http' | 'tcp' | 'ping'>(
    service?.checkType && ['http', 'tcp', 'ping'].includes(service.checkType)
      ? (service.checkType as 'http' | 'tcp' | 'ping')
      : 'http'
  );
  const [port, setPort] = useState<number | ''>(service?.port || (service?.url ? extractPort(service.url) : ''));
  const [interval, setInterval] = useState<number>(60);
  const [timeout, setTimeoutVal] = useState<number>(5);
  const [maxRetries, setMaxRetries] = useState<number>(1);
  const [retryInterval, setRetryInterval] = useState<number>(30);
  const [acceptedStatusCodes, setAcceptedStatusCodes] = useState<string>('200-299');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'HEAD' | 'POST'>('GET');
  const [ignoreTls, setIgnoreTls] = useState<boolean>(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevServiceId, setPrevServiceId] = useState(service?.id);
  if (service && service.id !== prevServiceId) {
    setPrevServiceId(service.id);
    setName(service.name);
    setUrl(service.url || '');
    setCheckType(
      service.checkType && ['http', 'tcp', 'ping'].includes(service.checkType)
        ? (service.checkType as 'http' | 'tcp' | 'ping')
        : 'http'
    );
    setPort(service.port || (service.url ? extractPort(service.url) : ''));
  }

  if (!isOpen || !service) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Partial<Service> = {
      name,
      url: checkType !== 'ping' ? url : undefined,
      checkType,
      port: checkType === 'tcp' && typeof port === 'number' ? port : undefined,
      checkInterval: interval,
      timeoutSeconds: timeout,
      maxRetries,
      retryInterval,
      acceptedStatusCodes: checkType === 'http' ? acceptedStatusCodes : undefined,
      httpMethod: checkType === 'http' ? httpMethod : undefined,
      ignoreTls: checkType === 'http' ? ignoreTls : undefined
    };

    try {
      await enableUptime(service.id, payload);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('uptime.enableError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('uptime.enableTitle')}
      subtitle={service.name}
      icon={<Zap className="w-5 h-5 text-[var(--status-up)]" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--status-down-bg)] border border-[var(--status-down)]/30 text-[var(--status-down)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('services.formName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="input w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('services.formCheckType')}</label>
            <select
              value={checkType}
              onChange={(e) => setCheckType(e.target.value as 'http' | 'tcp' | 'ping')}
              className="input w-full cursor-pointer"
            >
              <option value="http">{t('services.checkTypeHttp')}</option>
              <option value="tcp">{t('services.checkTypeTcp')}</option>
              <option value="ping">{t('services.checkTypePing')}</option>
            </select>
          </div>
          {checkType !== 'ping' ? (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                {checkType === 'http' ? t('uptime.targetUrl') : t('uptime.targetHost')}
              </label>
              <input
                type={checkType === 'http' ? 'url' : 'text'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={checkType === 'http' ? 'https://example.com/health' : '192.168.1.10'}
                required
                className="input w-full"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('uptime.pingHost')}</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('uptime.hostOrIpPlaceholder')}
                required
                className="input w-full"
              />
            </div>
          )}
        </div>

        {checkType === 'tcp' && (
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('services.formPort')}</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value ? parseInt(e.target.value, 10) : '')}
              placeholder="80, 443, 5432 vb."
              required
              className="input w-full"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('uptime.intervalSeconds')}</label>
            <input
              type="number"
              min={10}
              value={interval}
              onChange={(e) => setInterval(parseInt(e.target.value, 10) || 60)}
              required
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('uptime.timeoutSeconds')}</label>
            <input
              type="number"
              min={1}
              value={timeout}
              onChange={(e) => setTimeoutVal(parseInt(e.target.value, 10) || 5)}
              required
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('uptime.maxRetries')}</label>
            <input
              type="number"
              min={0}
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value, 10) || 0)}
              required
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('uptime.retryInterval')}</label>
            <input
              type="number"
              min={5}
              value={retryInterval}
              onChange={(e) => setRetryInterval(parseInt(e.target.value, 10) || 10)}
              required
              className="input w-full"
            />
          </div>
        </div>

        {checkType === 'http' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('uptime.httpMethod')}</label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as 'GET' | 'HEAD' | 'POST')}
                className="input w-full cursor-pointer"
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">{t('uptime.acceptedCodes')}</label>
              <input
                type="text"
                value={acceptedStatusCodes}
                onChange={(e) => setAcceptedStatusCodes(e.target.value)}
                placeholder="200-299, 301, 302"
                className="input w-full"
              />
            </div>
          </div>
        )}

        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreTls}
              onChange={(e) => setIgnoreTls(e.target.checked)}
              className="accent-[var(--cloud-200)] rounded"
            />
            <span className="text-xs text-[var(--text-secondary)]">{t('uptime.ignoreTls')}</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-hairline)]">
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
            icon={saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
          >
            {t('uptime.enableConfirmBtn')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
