import React from 'react';
import { useI18n } from '../../i18n';
import type { EditCheckType } from './editService.utils';

interface EditServiceCheckTypeSectionProps {
  checkType: EditCheckType;
  onChangeCheckType: (value: EditCheckType) => void;
  url: string;
  onChangeUrl: (value: string) => void;
  health: string;
  onChangeHealth: (value: string) => void;
  port: number | '';
  onChangePort: (value: number | '') => void;
}

const inputClass = 'w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all';

export const EditServiceCheckTypeSection: React.FC<EditServiceCheckTypeSectionProps> = ({
  checkType,
  onChangeCheckType,
  url,
  onChangeUrl,
  health,
  onChangeHealth,
  port,
  onChangePort
}) => {
  const { t } = useI18n();

  const options: { value: EditCheckType; label: string }[] = [
    { value: 'http', label: 'HTTP / HTTPS' },
    { value: 'tcp', label: 'TCP Port' },
    { value: 'ping', label: 'ICMP Ping' },
    { value: 'docker', label: t('services.checkTypeDocker') },
    { value: 'none', label: t('services.checkTypeNone') },
  ];

  return (
    <>
      {/* Kontrol Türü (Check Type) */}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">
          {t('services.formCheckType')}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {options.map((opt) => (
            <label key={opt.value} className={`flex flex-col items-center justify-center p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
              checkType === opt.value
                ? 'bg-white text-black font-semibold border-white shadow-xs'
                : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05]'
            }`}>
              <input
                type="radio"
                name="editCheckType"
                value={opt.value}
                checked={checkType === opt.value}
                onChange={() => onChangeCheckType(opt.value)}
                className="sr-only"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* URL & Reverse Proxy Alan Adı */}
      {checkType === 'http' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formUrlReverseProxy', { url: t('services.formUrl') })}
            </label>
            <input
              type="text"
              placeholder={t('services.formUrlPlaceholder')}
              value={url}
              onChange={(e) => onChangeUrl(e.target.value)}
              className={inputClass}
            />
            <p className="text-[11px] text-white/40 mt-1">
              {t('services.reverseProxyHint')}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formHealthUrl')}
            </label>
            <input
              type="text"
              placeholder={t('services.formHealthPlaceholder')}
              value={health}
              onChange={(e) => onChangeHealth(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* TCP Ayarları */}
      {checkType === 'tcp' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formHost')}
            </label>
            <input
              type="text"
              placeholder={t('services.formHostPlaceholder')}
              value={url}
              onChange={(e) => onChangeUrl(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              {t('services.formPort')}
            </label>
            <input
              type="number"
              placeholder="5010"
              value={port}
              onChange={(e) => onChangePort(e.target.value ? Number(e.target.value) : '')}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* ICMP Ping Ayarları */}
      {checkType === 'ping' && (
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1">
            {t('services.formPingHost')}
          </label>
          <input
            type="text"
            required
            placeholder={t('services.formPingHostPlaceholder')}
            value={url}
            onChange={(e) => onChangeUrl(e.target.value)}
            className={inputClass}
          />
          <p className="text-[11px] text-white/40 mt-1">
            {t('services.formPingHint')}
          </p>
        </div>
      )}

      {checkType === 'docker' && (
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/70">
          {t('services.dockerDaemonHint')}
        </div>
      )}
    </>
  );
};
