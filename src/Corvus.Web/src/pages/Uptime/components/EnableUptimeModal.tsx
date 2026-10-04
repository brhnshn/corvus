import React, { useState, useEffect } from 'react';
import { X, Radio, CheckCircle2, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { enableUptime, testConnection } from '../../../api/uptime';
import type { Service, TestConnectionResponse } from '../../../types';
import { useI18n } from '../../../i18n';

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
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [port, setPort] = useState<number | undefined>(undefined);
  const [checkType, setCheckType] = useState<'http' | 'tcp' | 'ping'>('http');
  const [isPublic, setIsPublic] = useState(false);
  const [checkInterval, setCheckInterval] = useState(60);
  const [ignoreTls, setIgnoreTls] = useState(true);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setUrl(service.url || '');
      setPort(service.port || undefined);
      setCheckType(service.checkType === 'tcp' ? 'tcp' : (service.checkType === 'ping' ? 'ping' : 'http'));
      setIsPublic(service.isPublic || false);
      setCheckInterval(service.checkInterval || 60);
      setIgnoreTls(service.ignoreTls ?? true);
      setTestResult(null);
      setError(null);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await testConnection({
        checkType,
        url: url || undefined,
        port: port || undefined,
        timeoutSeconds: 5,
        ignoreTls
      });
      setTestResult(res);
    } catch (err: unknown) {
      setTestResult({
        success: false,
        responseTimeMs: 0,
        message: err instanceof Error ? err.message : 'Bağlantı testi başarısız oldu.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await enableUptime(service.id, { name, url: url || undefined, port: port || undefined, checkType, isPublic, checkInterval, ignoreTls });
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'İzleme aktif edilirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none overflow-y-auto">
      <div className="w-full max-w-lg rounded-[28px] sheet-glass border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,.7),inset_0_1px_0_rgba(255,255,255,.15)] overflow-hidden flex flex-col my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-[#eceef6]">
              <Zap className="w-5 h-5 text-[#d5d5dc]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#eceef6]">Uptime Takibine Al</h3>
              <p className="text-xs text-[#9ba0b5]">{service.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-[#9ba0b5] hover:text-[#eceef6] hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">Servis Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6] text-sm focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">Denetim Türü</label>
              <select
                value={checkType}
                onChange={(e) => setCheckType(e.target.value as 'http' | 'tcp' | 'ping')}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6] text-sm focus:outline-none focus:border-white/20 transition-colors"
              >
                <option value="http" className="bg-[#1b1d2a] text-[#eceef6]">HTTP / HTTPS</option>
                <option value="tcp" className="bg-[#1b1d2a] text-[#eceef6]">TCP Port</option>
                <option value="ping" className="bg-[#1b1d2a] text-[#eceef6]">ICMP Ping</option>
              </select>
            </div>
            {checkType !== 'ping' ? (
              <div>
                <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">Port (Opsiyonel)</label>
                <input
                  type="number"
                  value={port ?? ''}
                  onChange={(e) => setPort(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="Örn: 8080"
                  className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6] text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">Protokol</label>
                <div className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6] text-xs font-mono flex items-center h-[38px]">
                  ICMP Echo Request
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
              {checkType === 'http' ? 'Hedef URL' : checkType === 'ping' ? 'Hedef Host / IP' : 'Hedef Host'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  checkType === 'http'
                    ? 'http://192.168.1.50:8080'
                    : checkType === 'ping'
                    ? '1.1.1.1 veya router.local'
                    : '192.168.1.50'
                }
                className="flex-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#eceef6] text-sm focus:outline-none focus:border-white/20 transition-colors"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[#eceef6] text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-[#d5d5dc]" />}
                <span>Sına</span>
              </button>
            </div>
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <div className="flex items-center gap-2">
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
              <span className="font-mono text-[11px] font-semibold">{testResult.responseTimeMs} ms</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#9ba0b5] mb-1.5">
              Kontrol Aralığı (Saniye): {checkInterval}s
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value, 10))}
              className="w-full accent-white cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-white/10 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-white focus:ring-0"
              />
              <span className="text-xs text-[#eceef6]">Genel Durum Sayfasında (Status Page) Göster</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreTls}
                onChange={(e) => setIgnoreTls(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-white focus:ring-0"
              />
              <span className="text-xs text-[#9ba0b5]">Kendinden İmzalı SSL/TLS Hatalarını Yoksay</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
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
              className="px-5 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-[#eceef6] shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>İzlemeye Al</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
