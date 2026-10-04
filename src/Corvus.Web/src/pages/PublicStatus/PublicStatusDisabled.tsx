import React from 'react';
import { EyeOff, ArrowLeft } from 'lucide-react';
import { useI18n } from '../../i18n';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { Button } from '../../components/ui/Button';

interface PublicStatusDisabledProps {
  message?: string;
}

export const PublicStatusDisabled: React.FC<PublicStatusDisabledProps> = ({ message }) => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#0d0e15] text-[#eceef6] flex flex-col items-center justify-center p-4 selection:bg-white/20 animate-rv">
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <LanguageSwitch variant="compact" />
      </div>

      <div className="w-full max-w-md surface rounded-[24px] p-8 text-center space-y-5 shadow-2xl border border-white/10">
        <div className="w-14 h-14 rounded-[16px] bg-[#fbbf24]/15 border border-[#fbbf24]/30 text-[#fbbf24] flex items-center justify-center mx-auto">
          <EyeOff className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#eceef6]">
            {t('publicStatus.disabledTitle') || 'Durum Sayfası Devre Dışı'}
          </h2>
          <p className="text-xs sm:text-sm text-[#9ba0b5] leading-relaxed">
            {message || (t('publicStatus.disabledDesc') || 'Herkese açık durum sayfası yönetici tarafından kapatılmıştır.')}
          </p>
        </div>

        <div className="pt-2">
          <a href="/">
            <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
              {t('publicStatus.adminPanelBtn') || 'Yönetim Paneline Dön'}
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
