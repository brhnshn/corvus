import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../i18n';

export interface AdvancedCheckOptionsProps {
  checkType: 'http' | 'tcp' | 'docker' | 'none' | 'ping';
  checkInterval: number | '';
  onChangeCheckInterval: (val: number | '') => void;
  timeoutSeconds: number | '';
  onChangeTimeoutSeconds: (val: number | '') => void;
  maxRetries: number | '';
  onChangeMaxRetries: (val: number | '') => void;
  retryInterval: number | '';
  onChangeRetryInterval: (val: number | '') => void;
  ignoreTls: boolean;
  onChangeIgnoreTls: (val: boolean) => void;
  acceptedStatusCodes: string;
  onChangeAcceptedStatusCodes: (val: string) => void;
  httpMethod: string;
  onChangeHttpMethod: (val: string) => void;
  expectedBody?: string;
  onChangeExpectedBody?: (val: string) => void;
}

export const AdvancedCheckOptions: React.FC<AdvancedCheckOptionsProps> = ({
  checkType,
  checkInterval,
  onChangeCheckInterval,
  timeoutSeconds,
  onChangeTimeoutSeconds,
  maxRetries,
  onChangeMaxRetries,
  retryInterval,
  onChangeRetryInterval,
  ignoreTls,
  onChangeIgnoreTls,
  acceptedStatusCodes,
  onChangeAcceptedStatusCodes,
  httpMethod,
  onChangeHttpMethod,
  expectedBody = '',
  onChangeExpectedBody,
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  if (checkType === 'none') {
    return null;
  }

  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-white/90 hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-white/70" />
          <span>{t('services.advancedOptionsTitle')}</span>
        </span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/50" /> : <ChevronDown className="w-3.5 h-3.5 text-white/50" />}
      </button>

      {isOpen && (
        <div className="p-4 border-t border-white/10 space-y-4 bg-black/20 text-xs">
          {/* Periyot ve Zaman Aşımı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                {t('services.checkIntervalLabel')} (sn)
              </label>
              <input
                type="number"
                min="5"
                max="86400"
                placeholder="60"
                value={checkInterval}
                onChange={(e) => onChangeCheckInterval(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[10px] text-white/40 mt-1">{t('services.checkIntervalHelp')}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                {t('services.timeoutSecondsLabel')} (sn)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                placeholder="5"
                value={timeoutSeconds}
                onChange={(e) => onChangeTimeoutSeconds(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[10px] text-white/40 mt-1">{t('services.timeoutSecondsHelp')}</p>
            </div>
          </div>

          {/* Yeniden Deneme Sayısı ve Aralığı */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                {t('services.maxRetriesLabel')}
              </label>
              <input
                type="number"
                min="0"
                max="10"
                placeholder="1"
                value={maxRetries}
                onChange={(e) => onChangeMaxRetries(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[10px] text-white/40 mt-1">{t('services.maxRetriesHelp')}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                {t('services.retryIntervalLabel')} (sn)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                placeholder="30"
                value={retryInterval}
                onChange={(e) => onChangeRetryInterval(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
              />
              <p className="text-[10px] text-white/40 mt-1">{t('services.retryIntervalHelp')}</p>
            </div>
          </div>

          {/* Sadece HTTP/HTTPS İçin Özel Ayarlar */}
          {checkType === 'http' && (
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">
                    {t('services.httpMethodLabel')}
                  </label>
                  <select
                    value={httpMethod || 'GET'}
                    onChange={(e) => onChangeHttpMethod(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 cursor-pointer"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">
                    {t('services.acceptedStatusCodesLabel')}
                  </label>
                  <input
                    type="text"
                    placeholder="200-299, 301, 302"
                    value={acceptedStatusCodes}
                    onChange={(e) => onChangeAcceptedStatusCodes(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                  />
                  <p className="text-[10px] text-white/40 mt-1">{t('services.acceptedStatusCodesHelp')}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  {t('services.expectedBodyLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('services.expectedBodyPlaceholder')}
                  value={expectedBody}
                  onChange={(e) => onChangeExpectedBody?.(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                />
                <p className="text-[10px] text-white/40 mt-1">{t('services.expectedBodyHelp')}</p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={ignoreTls}
                    onChange={(e) => onChangeIgnoreTls(e.target.checked)}
                    className="accent-white rounded"
                  />
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('services.ignoreTlsLabel')}</span>
                  </span>
                </label>
                <p className="text-[10px] text-white/40 ml-6 mt-1">
                  {t('services.ignoreTlsHelp')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
