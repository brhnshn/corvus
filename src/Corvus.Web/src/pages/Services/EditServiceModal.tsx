import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useI18n } from '../../i18n';
import { api, type Service } from '../../api/client';
import { AdvancedCheckOptions } from './AdvancedCheckOptions';
import { TagInput } from '../../components/common/TagInput';

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
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formDesc, setFormDesc] = useState('');
  const [formHealth, setFormHealth] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formCheckType, setFormCheckType] = useState<'http' | 'tcp' | 'docker' | 'none' | 'ping'>('http');
  const [formPort, setFormPort] = useState<number | ''>('');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formCheckInterval, setFormCheckInterval] = useState<number | ''>(60);
  const [formTimeoutSeconds, setFormTimeoutSeconds] = useState<number | ''>(5);
  const [formMaxRetries, setFormMaxRetries] = useState<number | ''>(1);
  const [formRetryInterval, setFormRetryInterval] = useState<number | ''>(30);
  const [formIgnoreTls, setFormIgnoreTls] = useState(false);
  const [formAcceptedStatusCodes, setFormAcceptedStatusCodes] = useState('200-299');
  const [formHttpMethod, setFormHttpMethod] = useState('GET');
  const [formExpectedBody, setFormExpectedBody] = useState('');
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
      setFormCheckType((service.checkType as 'http' | 'tcp' | 'docker' | 'none' | 'ping') || (service.source === 'docker' && !service.url ? 'docker' : 'http'));
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
        httpMethod: formHttpMethod || 'GET',
        expectedBody: formExpectedBody.trim() || undefined,
        tags: formTags
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="sheet-glass border border-white/10 rounded-[28px] p-5 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl my-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="font-semibold text-white text-base">
              {t('services.editModalTitle')}
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              {service.source === 'docker' ? `${service.name} (Docker Konteyneri)` : service.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3.5 text-sm">
          {/* Servis Adı */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formName')}
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm font-medium"
            />
          </div>

          {/* Kontrol Türü (Check Type) */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">
              {t('services.formCheckType')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <label className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                formCheckType === 'http'
                  ? 'bg-white text-black font-semibold border-white shadow-xs'
                  : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
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

              <label className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                formCheckType === 'tcp'
                  ? 'bg-white text-black font-semibold border-white shadow-xs'
                  : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
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

              <label className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                formCheckType === 'ping'
                  ? 'bg-white text-black font-semibold border-white shadow-xs'
                  : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
              }`}>
                <input
                  type="radio"
                  name="editCheckType"
                  value="ping"
                  checked={formCheckType === 'ping'}
                  onChange={() => setFormCheckType('ping')}
                  className="sr-only"
                />
                <span>ICMP Ping</span>
              </label>

              <label className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                formCheckType === 'docker'
                  ? 'bg-white text-black font-semibold border-white shadow-xs'
                  : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
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

              <label className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                formCheckType === 'none'
                  ? 'bg-white text-black font-semibold border-white shadow-xs'
                  : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
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
                <label className="block text-xs font-medium text-white/60 mb-1">
                  {t('services.formUrl')} (Reverse Proxy Alan Adı veya URL)
                </label>
                <input
                  type="text"
                  placeholder="https://app.example.com veya http://localhost:5010"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
                <p className="text-[11px] text-white/40 mt-1">
                  Nginx veya ters proxy yapılandırmanızdaki gerçek domain adresini girin (örn: https://burhanlife.com).
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  {t('services.formHealthUrl')}
                </label>
                <input
                  type="text"
                  placeholder="https://app.example.com/health veya /api/health"
                  value={formHealth}
                  onChange={(e) => setFormHealth(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
            </div>
          )}

          {/* TCP Ayarları */}
          {formCheckType === 'tcp' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  {t('services.formHost')}
                </label>
                <input
                  type="text"
                  placeholder="localhost veya IP"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  {t('services.formPort')}
                </label>
                <input
                  type="number"
                  placeholder="5010"
                  value={formPort}
                  onChange={(e) => setFormPort(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
              </div>
            </div>
          )}

          {/* ICMP Ping Ayarları */}
          {formCheckType === 'ping' && (
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                {t('services.formPingHost')}
              </label>
              <input
                type="text"
                required
                placeholder={t('services.formPingHostPlaceholder')}
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[11px] text-white/40 mt-1">
                Hedef IP adresi veya hostname girin (örn: 1.1.1.1 veya router.local). Port ve HTTP gerektirmez.
              </p>
            </div>
          )}

          {formCheckType === 'docker' && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/70">
              Bu servis doğrudan Docker daemon üzerinden izlenecektir. Konteyner çalışma durumu (running / exited) üzerinden otomatik Uptime kontrolü kaydedilir.
            </div>
          )}

          {/* Kategori ve İkon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                {t('services.formCategory')}
              </label>
              <input
                type="text"
                placeholder={t('services.defaultCategory')}
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                {t('services.formIcon')} (Emoji / Metin)
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="🌐 veya 🚀"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Etiketler (Ortam / Grup) */}
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

          {/* Açıklama */}
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formDescription')}
            </label>
            <textarea
              rows={2}
              placeholder="Servis açıklaması..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all text-xs resize-none"
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
            expectedBody={formExpectedBody}
            onChangeExpectedBody={setFormExpectedBody}
          />

          {/* Genel Durum Sayfası Görünürlüğü */}
          <div className="pt-1">
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

          {/* Butonlar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-md"
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
