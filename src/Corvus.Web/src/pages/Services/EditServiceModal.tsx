import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { api, type Service } from '../../api/client';
import { AdvancedCheckOptions } from './AdvancedCheckOptions';

interface EditServiceModalProps {
  isOpen: boolean;
  service: Service | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export const EditServiceModal: React.FC<EditServiceModalProps> = ({
  isOpen,
  service,
  onClose,
  onSuccess
}) => {
  const { t } = useI18n();
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formHealth, setFormHealth] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formCheckType, setFormCheckType] = useState<'http' | 'tcp' | 'docker' | 'none'>('http');
  const [formPort, setFormPort] = useState<number | ''>('');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formCheckInterval, setFormCheckInterval] = useState<number | ''>(60);
  const [formTimeoutSeconds, setFormTimeoutSeconds] = useState<number | ''>(5);
  const [formMaxRetries, setFormMaxRetries] = useState<number | ''>(1);
  const [formRetryInterval, setFormRetryInterval] = useState<number | ''>(30);
  const [formIgnoreTls, setFormIgnoreTls] = useState(false);
  const [formAcceptedStatusCodes, setFormAcceptedStatusCodes] = useState('200-299');
  const [formHttpMethod, setFormHttpMethod] = useState('GET');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (service) {
      setFormName(service.name || '');
      setFormUrl(service.url || '');
      setFormCategory(service.category || '');
      setFormDesc(service.description || '');
      setFormHealth(service.healthCheckUrl || '');
      setFormIcon(service.icon || '');
      setFormCheckType((service.checkType as 'http' | 'tcp' | 'docker' | 'none') || (service.source === 'docker' && !service.url ? 'docker' : 'http'));
      setFormPort(service.port !== undefined && service.port !== null ? service.port : '');
      setFormIsPublic(service.isPublic === true);
      setFormCheckInterval(service.checkInterval ?? 60);
      setFormTimeoutSeconds(service.timeoutSeconds ?? 5);
      setFormMaxRetries(service.maxRetries ?? 1);
      setFormRetryInterval(service.retryInterval ?? 30);
      setFormIgnoreTls(service.ignoreTls === true);
      setFormAcceptedStatusCodes(service.acceptedStatusCodes || '200-299');
      setFormHttpMethod(service.httpMethod || 'GET');
      setErrorMsg(null);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    let finalUrl = formUrl.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl) && formCheckType === 'http') {
      finalUrl = `https://${finalUrl}`;
    }

    let finalHealth = formHealth.trim();
    if (finalHealth && !/^https?:\/\//i.test(finalHealth) && formCheckType === 'http') {
      if (finalHealth.startsWith('/')) {
        if (finalUrl) {
          try {
            const parsed = new URL(finalUrl);
            finalHealth = `${parsed.origin}${finalHealth}`;
          } catch {
            finalHealth = `${finalUrl}${finalHealth}`;
          }
        }
      } else {
        finalHealth = `https://${finalHealth}`;
      }
    }

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
        httpMethod: formHttpMethod || 'GET'
      });

      onClose();
      await onSuccess();
    } catch (err: unknown) {
      console.error('Servis güncellenemedi:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Güncelleme sırasında bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-[#1a1d29] border border-[#2a2e3f] rounded-2xl p-5 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl my-auto">
        <div className="flex items-center justify-between border-b border-[#2a2e3f] pb-3">
          <div>
            <h3 className="font-semibold text-[#e5e7eb] text-base">
              {t('services.editModalTitle')}
            </h3>
            <p className="text-xs text-[#9ca3af] mt-0.5">
              {service.source === 'docker' ? `${service.name} (Docker Konteyneri)` : service.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-sm">
          {/* Servis Adı */}
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">
              {t('services.formName')}
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Kontrol Türü (Check Type) */}
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1.5">
              {t('services.formCheckType')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                formCheckType === 'http'
                  ? 'bg-indigo-500/10 border-indigo-500 text-white font-medium shadow-xs'
                  : 'bg-[#0f1117] border-[#2a2e3f] text-[#9ca3af] hover:border-[#3f4458]'
              }`}>
                <input
                  type="radio"
                  name="editCheckType"
                  value="http"
                  checked={formCheckType === 'http'}
                  onChange={() => setFormCheckType('http')}
                  className="sr-only"
                />
                <span>HTTP / HTTPS</span>
              </label>

              <label className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                formCheckType === 'tcp'
                  ? 'bg-indigo-500/10 border-indigo-500 text-white font-medium shadow-xs'
                  : 'bg-[#0f1117] border-[#2a2e3f] text-[#9ca3af] hover:border-[#3f4458]'
              }`}>
                <input
                  type="radio"
                  name="editCheckType"
                  value="tcp"
                  checked={formCheckType === 'tcp'}
                  onChange={() => setFormCheckType('tcp')}
                  className="sr-only"
                />
                <span>TCP Port</span>
              </label>

              <label className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                formCheckType === 'docker'
                  ? 'bg-indigo-500/10 border-indigo-500 text-white font-medium shadow-xs'
                  : 'bg-[#0f1117] border-[#2a2e3f] text-[#9ca3af] hover:border-[#3f4458]'
              }`}>
                <input
                  type="radio"
                  name="editCheckType"
                  value="docker"
                  checked={formCheckType === 'docker'}
                  onChange={() => setFormCheckType('docker')}
                  className="sr-only"
                />
                <span>Docker Durumu</span>
              </label>

              <label className={`flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer text-xs transition-all ${
                formCheckType === 'none'
                  ? 'bg-indigo-500/10 border-indigo-500 text-white font-medium shadow-xs'
                  : 'bg-[#0f1117] border-[#2a2e3f] text-[#9ca3af] hover:border-[#3f4458]'
              }`}>
                <input
                  type="radio"
                  name="editCheckType"
                  value="none"
                  checked={formCheckType === 'none'}
                  onChange={() => setFormCheckType('none')}
                  className="sr-only"
                />
                <span>Devre Dışı</span>
              </label>
            </div>
          </div>

          {/* URL & Reverse Proxy Alan Adı */}
          {formCheckType === 'http' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                  {t('services.formUrl')} (Reverse Proxy Alan Adı veya URL)
                </label>
                <input
                  type="text"
                  placeholder="https://app.example.com veya http://localhost:5010"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-[#9ca3af]/70 mt-1">
                  Nginx veya ters proxy yapılandırmanızdaki gerçek domain adresini girin (örn: https://burhanlife.com).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                  {t('services.formHealthUrl')}
                </label>
                <input
                  type="text"
                  placeholder="https://app.example.com/health veya /api/health"
                  value={formHealth}
                  onChange={(e) => setFormHealth(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TCP Ayarları */}
          {formCheckType === 'tcp' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                  {t('services.formHost')}
                </label>
                <input
                  type="text"
                  placeholder="localhost veya IP"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                  {t('services.formPort')}
                </label>
                <input
                  type="number"
                  placeholder="5010"
                  value={formPort}
                  onChange={(e) => setFormPort(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {formCheckType === 'docker' && (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
              Bu servis doğrudan Docker daemon üzerinden izlenecektir. Konteyner çalışma durumu (running / exited) üzerinden otomatik Uptime kontrolü kaydedilir.
            </div>
          )}

          {/* Kategori ve İkon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                {t('services.formCategory')}
              </label>
              <input
                type="text"
                placeholder={t('services.defaultCategory')}
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                {t('services.formIcon')} (Emoji / Metin)
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="🌐 veya 🚀"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-indigo-500 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">
              {t('services.formDescription')}
            </label>
            <textarea
              rows={2}
              placeholder="Servis açıklaması..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2e3f] rounded-lg px-3 py-2 text-[#e5e7eb] focus:outline-none focus:border-indigo-500 text-xs resize-none"
            />
          </div>

          {/* Gelişmiş Uptime & Kontrol Parametreleri (Modüler Bileşen) */}
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
          />

          {/* Genel Durum Sayfası Görünürlüğü */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
                className="w-4 h-4 rounded-sm bg-[#0f1117] border-[#2a2e3f] text-indigo-500 focus:ring-0 focus:ring-offset-0"
              />
              <span>{t('services.formIsPublic')}</span>
            </label>
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2a2e3f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[#9ca3af] hover:text-white hover:bg-[#0f1117] transition-colors cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? t('common.saving') : t('common.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
