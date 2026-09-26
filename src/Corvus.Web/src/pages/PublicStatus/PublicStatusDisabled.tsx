import React from 'react';
import { EyeOff, ArrowLeft } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';

interface PublicStatusDisabledProps {
  message?: string;
}

export const PublicStatusDisabled: React.FC<PublicStatusDisabledProps> = ({ message }) => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30">
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <LanguageSwitch variant="compact" />
      </div>

      <div className="w-full max-w-md bg-[#1a1d29] border border-[#2a2e3f] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <EyeOff className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            {t('publicStatus.disabledTitle')}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {message || t('publicStatus.disabledDesc')}
          </p>
        </div>

        <div className="pt-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('publicStatus.adminPanelBtn')}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
