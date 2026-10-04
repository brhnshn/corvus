import React, { useState } from 'react';
import { api } from '../api/client';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface RegistrationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export const RegistrationPromptModal: React.FC<RegistrationPromptModalProps> = ({
  isOpen,
  onClose,
  onDisabled
}) => {
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleDisableRegistration = async () => {
    setLoading(true);
    try {
      await api.toggleRegistration(false);
      onDisabled();
      onClose();
    } catch (err: unknown) {
      alert(`${t('common.error')}: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
      <div className="sheet-glass border border-white/10 rounded-[28px] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/50 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          title={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{t('regModal.title')}</h3>
            <p className="text-xs text-white/50">{t('regModal.subtitle')}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-xs text-white/70 leading-relaxed mb-5">
          {t('regModal.desc')}
        </p>

        <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-xs text-white/70 mb-6 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            {t('regModal.hint')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.04] rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            {t('regModal.keepOpenBtn')}
          </button>
          <button
            type="button"
            onClick={handleDisableRegistration}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-white/90 text-black text-xs font-semibold rounded-xl transition-all shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{t('regModal.disableBtn')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
