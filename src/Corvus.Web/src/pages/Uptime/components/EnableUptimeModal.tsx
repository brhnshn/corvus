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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-[#14161f] border border-[#2a2e3f] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2e3f] bg-[#1a1d29]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#e5e7eb]">Uptime Takibine Al</h3>
              <p className="text-xs text-[#9ca3af]">{service.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#2a2e3f]/50 transition-colors">
            <X className="w-5 h-5" />
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
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Servis Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Denetim Türü</label>
              <select
                value={checkType}
                onChange={(e) => setCheckType(e.target.value as 'http' | 'tcp' | 'ping')}
                className="w-full px-3 py-2 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="http">HTTP / HTTPS</option>
                <option value="tcp">TCP Port</option>
                <option value="ping">ICMP Ping</option>
              </select>
            </div>
            {checkType !== 'ping' ? (
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Port (Opsiyonel)</label>
                <input
                  type="number"
                  value={port ?? ''}
                  onChange={(e) => setPort(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="Örn: 8080"
                  className="w-full px-3 py-2 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">Protokol</label>
                <div className="w-full px-3 py-2 rounded-xl bg-[#1a1d29]/50 border border-[#2a2e3f] text-cyan-400 text-xs font-mono flex items-center h-[38px]">
                  ICMP Echo Request
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
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
                className="flex-1 px-3 py-2 rounded-xl bg-[#1a1d29] border border-[#2a2e3f] text-[#e5e7eb] text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-2 rounded-xl bg-[#2a2e3f] hover:bg-[#34394f] text-[#e5e7eb] text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
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
            <label className="block text-xs font-semibold text-[#9ca3af] mb-1.5">
              Kontrol Aralığı (Saniye): {checkInterval}s
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={checkInterval}
              onChange={(e) => setCheckInterval(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-[#2a2e3f] space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-[#2a2e3f] text-indigo-600 focus:ring-indigo-500/20"
              />
              <span className="text-xs text-[#e5e7eb]">Genel Durum Sayfasında (Status Page) Göster</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={ignoreTls}
                onChange={(e) => setIgnoreTls(e.target.checked)}
                className="rounded border-[#2a2e3f] text-indigo-600 focus:ring-indigo-500/20"
              />
              <span className="text-xs text-[#9ca3af]">Kendinden İmzalı SSL/TLS Hatalarını Yoksay</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d29] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-colors flex items-center gap-2 disabled:opacity-50"
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
